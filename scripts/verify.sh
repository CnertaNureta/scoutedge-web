#!/usr/bin/env bash
# scripts/verify.sh
#
# SINGLE SOURCE OF TRUTH for ScoutEdge migration acceptance criteria.
# Exit code 0 = ship-ready. Anything else = keep iterating.
#
# 改标准只改这一个文件。不要在 CLAUDE.md / migration-plan.md / 其他地方
# 重复写验收清单——它们会漂移，最后你不知道信哪个。

set -euo pipefail

# ───────────────────────────────────────────────
# 颜色 / 日志
# ───────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
step()  { echo -e "\n${YELLOW}→ $1${NC}"; }
pass()  { echo -e "${GREEN}✓ $1${NC}"; }
fail()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

START_TS=$(date +%s)
cd "$(dirname "$0")/.."

# ───────────────────────────────────────────────
# Gate 1: Lint (ESLint via Next.js)
# ───────────────────────────────────────────────
step "Lint"
npm run lint || fail "ESLint failed"
pass "Lint"

# ───────────────────────────────────────────────
# Gate 2: Type check (strict tsc)
# ───────────────────────────────────────────────
step "Typecheck"
npx tsc --noEmit || fail "TypeScript errors"
pass "Typecheck"

# ───────────────────────────────────────────────
# Gate 3: Unit tests (Vitest)
# 如果你用 Jest，把 `vitest run` 改成 `jest --ci`
# ───────────────────────────────────────────────
step "Unit tests"
if [ -f vitest.config.ts ] || [ -f vitest.config.js ]; then
  npx vitest run || fail "Unit tests failed"
elif [ -f jest.config.ts ] || [ -f jest.config.js ]; then
  npx jest --ci || fail "Unit tests failed"
else
  echo "  (no unit test config found, skipping — add vitest/jest before relying on loop)"
fi
pass "Unit tests"

# ───────────────────────────────────────────────
# Gate 4: Production build
# 这一步抓 server/client component 边界错误、env 缺失、import 周期
# ───────────────────────────────────────────────
step "Next.js build"
npm run build || fail "Build failed"
pass "Build"

# ───────────────────────────────────────────────
# Gate 5: Playwright E2E
# ⚠️ 没有 Playwright 测试 = loop 会愉快地宣布假成功
# 至少要覆盖：match detail / ELO 排名 / live odds / auth
# ───────────────────────────────────────────────
step "E2E (Playwright)"
if [ -d tests/e2e ] || [ -d e2e ] || [ -f playwright.config.ts ]; then
  # `next build` above can leave a stale dev server in a broken state (500s on every route).
  # Playwright's `reuseExistingServer: !CI` would then reuse it and every test would fail.
  # Kill anything on port 3000 first so Playwright spins up a fresh dev server.
  STALE_PID=$(lsof -ti :3000 2>/dev/null || true)
  if [ -n "$STALE_PID" ]; then
    echo "  Killing stale dev server (PID $STALE_PID) on port 3000…"
    kill "$STALE_PID" 2>/dev/null || true
    # Wait up to 5s for the port to free
    for _ in 1 2 3 4 5; do
      sleep 1
      [ -z "$(lsof -ti :3000 2>/dev/null)" ] && break
    done
  fi
  npx playwright test --reporter=line || fail "Playwright tests failed"
  pass "E2E"
else
  fail "No Playwright config found. STOP — 写测试前不要跑 migration loop."
fi

# ───────────────────────────────────────────────
# Gate 6: 迁移完整度
# migration-plan.md 里不能还有 pending / in progress 状态的组件
# ───────────────────────────────────────────────
step "Migration plan complete?"
PLAN=".claude/plans/migration-plan.md"
if [ ! -f "$PLAN" ]; then fail "Migration plan not found at $PLAN"; fi

PENDING=$(grep -c '⏳ pending\|🔄 in progress' "$PLAN" || true)
BLOCKED=$(grep -c '⚠️ blocked' "$PLAN" || true)

if [ "$PENDING" -gt 0 ]; then
  fail "$PENDING 个组件还没完成（pending/in progress）"
fi
if [ "$BLOCKED" -gt 0 ]; then
  fail "$BLOCKED 个组件 blocked，需要人工处理"
fi
pass "All components ✅"

# ───────────────────────────────────────────────
# 全过了
# ───────────────────────────────────────────────
ELAPSED=$(($(date +%s) - START_TS))
echo -e "\n${GREEN}✅ ALL GATES PASSED${NC} (in ${ELAPSED}s) — ship-ready"
exit 0
