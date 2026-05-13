#!/usr/bin/env bash
# scripts/migrate-loop.sh
#
# 外层 loop：在 feature branch 上跑，最好在 tmux 里。
#   tmux new -s migrate
#   bash scripts/migrate-loop.sh
#
# 五重 kill switch:
#   1. MAX_ITER 硬上限
#   2. COST_CAP_USD 成本上限
#   3. 外部 verify.sh 是 ground truth（不信 Claude 自报）
#   4. 必须在 git branch 上跑（防 main 被搞坏）
#   5. tmux session 方便 detach + 回来 review

set -uo pipefail

# ───────────────────────────────────────────────
# 配置
# ───────────────────────────────────────────────
MAX_ITER="${MAX_ITER:-20}"
COST_CAP_USD="${COST_CAP_USD:-50}"
LOG_DIR="logs/migration-$(date +%Y%m%d-%H%M%S)"

# ───────────────────────────────────────────────
# 前置检查
# ───────────────────────────────────────────────
cd "$(dirname "$0")/.."

# 不允许在 main / master 上跑
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  echo "⛔ 拒绝在 $BRANCH 上跑。先 git checkout -b ui-migration-loop"
  exit 1
fi

# 检查 working tree 干净
if [[ -n $(git status --porcelain) ]]; then
  echo "⚠️  Working tree 有未提交改动。建议先 commit 或 stash。"
  read -p "继续? (y/N) " -n 1 -r
  echo
  [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

# 检查 Playwright 测试存在（防止假成功）
if ! ls tests/e2e/*.spec.ts 2>/dev/null && ! ls e2e/*.spec.ts 2>/dev/null; then
  echo "⛔ 没找到 Playwright 测试。先写测试再跑 loop。"
  exit 1
fi

mkdir -p "$LOG_DIR"
ITER=0
echo "🚀 Branch: $BRANCH | Max iter: $MAX_ITER | Cost cap: \$$COST_CAP_USD"
echo "📁 Logs: $LOG_DIR"

# ───────────────────────────────────────────────
# 主循环
# ───────────────────────────────────────────────
while [ $ITER -lt $MAX_ITER ]; do
  ITER=$((ITER+1))
  LOG_FILE="$LOG_DIR/iter-$(printf '%02d' $ITER).json"
  echo ""
  echo "════════════════════════════════════════════"
  echo " Iteration $ITER / $MAX_ITER"
  echo "════════════════════════════════════════════"

  PROMPT='读 .claude/plans/migration-plan.md。

任务规则：
1. 找第一个状态为 ⏳ pending 的组件
2. 把状态改成 🔄 in progress 并 commit 这一步
3. 按 Rules 部分迁移（取新 UI 的 JSX + Tailwind，保留旧的 Supabase queries / 类型 / props 接口）
4. 调用 qa-verifier subagent
5. QA_PASS：把状态改成 ✅ done，commit
6. QA fail：修，最多重试 3 次。还不行就改 ⚠️ blocked，跳过
7. 所有 ⏳ 都消失 且 bash scripts/verify.sh 退出 0 时，输出 exactly: MIGRATION_COMPLETE

千万不要：改 Supabase queries / 改类型定义 / 改 props 接口 / 删测试

现在开始，挑下一个 pending 组件。'

  claude -p "$PROMPT" \
    --max-turns 40 \
    --output-format json \
    --permission-mode acceptEdits \
    --dangerously-skip-permissions \
    > "$LOG_FILE" 2>&1 || echo "  (claude 返回非 0 退出码，继续检查)"

  # 检查完成信号
  if grep -q "MIGRATION_COMPLETE" "$LOG_FILE"; then
    echo "📢 Claude 报告完成，跑 verify.sh 验证..."
    if bash scripts/verify.sh; then
      echo ""
      echo "✅✅✅ DONE in $ITER iterations ✅✅✅"
      echo "Logs: $LOG_DIR"
      exit 0
    else
      echo "⚠️  Claude 说完成但 verify.sh 失败。继续。"
    fi
  fi

  # 成本上限
  CUR_COST=$(jq -s '[.[] | select(.total_cost_usd) | .total_cost_usd] | add // 0' \
    "$LOG_DIR"/*.json 2>/dev/null || echo 0)
  echo "  💰 累计成本: \$$CUR_COST"

  if (( $(echo "$CUR_COST > $COST_CAP_USD" | bc -l 2>/dev/null || echo 0) )); then
    echo "💸 Cost cap (\$$COST_CAP_USD) 超过. 停。"
    exit 2
  fi

  # 短 sleep 让 disk I/O 落地
  sleep 2
done

echo ""
echo "⚠️  Max iterations ($MAX_ITER) 用完。检查："
echo "   - $LOG_DIR/ 看每轮发生了啥"
echo "   - .claude/plans/migration-plan.md 看哪些 blocked"
echo "   - bash scripts/verify.sh 看哪一关挂"
exit 1
