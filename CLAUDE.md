<!--
   把下面这段 APPEND 到你 repo 根目录已有的 CLAUDE.md。
   不要替换整个 CLAUDE.md——只加这一段。
   关键原则：这里不重复写验收"内容"，只指向 verify.sh。
-->

## UI Migration (active sprint)

正在把 Claude Design 导出的新 UI 迁移到 ScoutEdge 现有组件。

### Acceptance criteria

**真相来源：`scripts/verify.sh`**

- "DONE" 的定义 = 该脚本 `exit 0`
- 不要重新解释或绕过这些标准——直接 `bash scripts/verify.sh` 跑
- 改标准请修改 verify.sh 本身，不要在这里加 prose 说明
- Stop hook 会在你想 stop 时自动跑 verify.sh

### Workflow routing

- 迁移进度状态：`.claude/plans/migration-plan.md`
- 迁移规则（不许改什么、Server vs Client 决策树）：同上文件的 Rules 部分
- 单个组件的迁移：delegate 到 `migration-implementer` subagent
- 验收：delegate 到 `qa-verifier` subagent（在 forked context 跑，不污染主对话）

### 关键禁忌

- ❌ 不要在 main / master branch 上跑迁移 loop
- ❌ 不要改 Supabase queries / TypeScript 类型 / props 接口
- ❌ 没写完 Playwright 测试前不要跑 `scripts/migrate-loop.sh`（会生成假成功）
- ❌ 不要在 CLAUDE.md 里复制验收清单——verify.sh 是单一来源

### 怎么跑

```bash
# 1. 切到 feature branch
git checkout -b ui-migration-loop

# 2. 确认 Playwright 测试覆盖关键路径
ls tests/e2e/

# 3. 在 tmux 里启动 loop
tmux new -s migrate
bash scripts/migrate-loop.sh

# 4. detach（Ctrl-b d）做别的事，每 30 min 回来 check
tmux attach -t migrate
```
