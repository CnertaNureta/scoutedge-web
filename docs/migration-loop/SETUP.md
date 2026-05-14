# ScoutEdge Migration Loop — Setup Bundle

把 Claude Design 导出的新 UI 迁移到现有 Next.js + Supabase repo 的自终止 loop。

## 文件总览

```
scoutedge-migration-loop/
├── README.md                              ← 你正在读
├── CLAUDE.md.snippet                      ← APPEND 到你 repo 的 CLAUDE.md
├── scripts/
│   ├── verify.sh                          ← 验收标准的单一来源（核心）
│   └── migrate-loop.sh                    ← 外层 bash loop + kill switches
└── .claude/
    ├── settings.json                      ← Stop hook 配置
    ├── agents/
    │   ├── migration-implementer.md       ← 迁移单个组件（opus）
    │   └── qa-verifier.md                 ← 跑 verify.sh（sonnet, forked）
    └── plans/
        └── migration-plan.md              ← 组件 mapping + 进度状态
```

## 安装（3 步）

### 1. 拷文件进 repo

```bash
# 从 ScoutEdge repo 根目录跑
cd /path/to/scoutedge

# 拷整个 bundle（含隐藏目录）
cp -r /path/to/scoutedge-migration-loop/. .

# 把 CLAUDE.md.snippet 内容追加到现有 CLAUDE.md
cat CLAUDE.md.snippet >> CLAUDE.md
rm CLAUDE.md.snippet

# 让脚本可执行
chmod +x scripts/verify.sh scripts/migrate-loop.sh
```

### 2. 改组件 mapping

打开 `.claude/plans/migration-plan.md`，把示例的组件名换成你 repo 里**真实**的组件名。漏一个就少迁一个。

```bash
# 列出实际 component 文件帮你对照
ls src/components/
ls app/  # for pages
```

### 3. 解压 Claude Design 导出的 zip

把它解压到 repo 内的 `design-handoff/` 目录（已 gitignore，或加进 `.gitignore`）：

```bash
unzip ~/Downloads/claude-design-export.zip -d design-handoff/
echo "design-handoff/" >> .gitignore
```

## 跑之前必须做的事

### ⚠️ 写 Playwright 测试

没有 E2E 测试，这个 loop **会产出假成功**。verify.sh 会拒绝在没找到 Playwright 配置时启动。

至少覆盖：
- [ ] 首页能加载，无 console error
- [ ] Match detail 页能加载，显示比分 / xG / probability widget
- [ ] ELO 排名页能加载，能排序
- [ ] Live odds 能从 Polymarket 加载（或 mock）
- [ ] 登录流程（auth）

骨架：

```bash
npm i -D @playwright/test
npx playwright install
mkdir -p tests/e2e
```

```typescript
// tests/e2e/critical-paths.spec.ts
import { test, expect } from '@playwright/test';

test('match detail renders without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/matches/test-match-id');
  await expect(page.getByTestId('match-score')).toBeVisible();
  expect(errors).toEqual([]);
});

// 加 ELO / odds / auth 等关键路径
```

### 切到 feature branch

```bash
git checkout -b ui-migration-loop
git add -A && git commit -m "chore: add migration loop infra"
```

## 跑

```bash
# 在 tmux 里跑（很重要——可以 detach）
tmux new -s migrate

# 启动 loop
bash scripts/migrate-loop.sh

# 想退出但继续跑：Ctrl-b 然后 d
# 回来看进度：
tmux attach -t migrate
```

## 监控

每 30 分钟回来看：
1. `logs/migration-*/` 里最新的 iter-NN.json
2. `.claude/plans/migration-plan.md` 里的状态进度
3. tmux 屏幕上的当前 iteration

## 调参

环境变量改默认值：

```bash
MAX_ITER=30 COST_CAP_USD=80 bash scripts/migrate-loop.sh
```

## 跑完后

```bash
# 1. 看最终结果
bash scripts/verify.sh

# 2. 看 git log，每个组件应该有一个 commit
git log --oneline

# 3. 启动 dev server，人工 QA
npm run dev

# 4. 跑 Vercel preview deployment 看视觉
vercel
```

## 修复策略

### Loop 卡住总是某一个组件

- 在 migration-plan.md 里手动把它标 `⚠️ blocked`
- 重启 loop，它会跳过这个继续做其他的
- 跑完后单独人工处理这个

### verify.sh 总是某一关挂

- 先单独跑那一关定位（比如只跑 `npx playwright test`）
- 如果是 flaky 测试，先 fix flake 再跑 loop
- 如果是测试本身写得太严，调整测试，不要调整 verify.sh 让它"宽容一点"

### 成本超 $50

- 看 `logs/migration-*/iter-*.json` 里哪一轮最贵
- 通常是某个组件反复试错——手动 blocked，跳过

## 关键设计原则

1. **单一来源**：验收标准只在 `verify.sh`，其他地方只 reference
2. **Forked context**：QA 在 subagent 跑，500 行测试输出不污染主对话
3. **外部 ground truth**：bash 退出码说了算，不信 Claude 自报
4. **五重 kill switch**：MAX_ITER / COST_CAP / verify.sh / branch 限制 / tmux

## 跑之前的 checklist

- [ ] 已切到 feature branch（不是 main）
- [ ] Working tree 干净（或已 stash）
- [ ] Playwright 测试已写并能通过
- [ ] `.claude/plans/migration-plan.md` 里组件名是你 repo 真实的
- [ ] `design-handoff/` 里有 Claude Design 导出的文件
- [ ] 跑 `bash scripts/verify.sh` 当前状态——记录 baseline 失败项
- [ ] 准备好 tmux session
