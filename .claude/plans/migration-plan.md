# UI Migration Plan — ScoutEdge

> 这个文件是迁移**进度状态**的单一来源。验收**标准**在 `scripts/verify.sh`。

## Component mapping

> 下表基于真实 `src/components/` 目录结构。
> `New design source` 列已对照 `design-handoff/` 实际文件填好；没对应的标 `N/A`。
> 状态：⏳ pending → 🔄 in progress → ✅ done / ⚠️ blocked
> `⏸ no-design`：design export 里没这个组件，**不进入迁移 loop**（verify.sh 不数）。

### home-magazine/ — 杂志式首页

| Old / Existing | New design source | Status | Notes |
|---|---|---|---|
| `src/components/home-magazine/HeroA.tsx` | `design-handoff/hero-a.jsx` | 🔄 in progress | 首屏 hero |
| `src/components/home-magazine/HeroLiveCard.tsx` | `design-handoff/hero-b.jsx` (candidate) | ⏳ pending | 首屏 live 比赛卡 — confirm by reading hero-b first |
| `src/components/home-magazine/HeroLiveTicker.tsx` | `design-handoff/hero-c.jsx` (candidate) | ⏳ pending | 滚动比分 ticker — confirm by reading hero-c first |
| `src/components/home-magazine/MagazineHomePage.tsx` | `design-handoff/home.html` + `design-handoff/design-canvas.jsx` | ⏳ pending | 整页 layout |
| `src/components/home-magazine/MoreModules.tsx` | `design-handoff/more-modules.jsx` | ⏳ pending | 模块入口 |
| `src/components/home-magazine/NextMatch.tsx` | `design-handoff/next-match.jsx` | ⏳ pending | 下一场比赛卡 |
| `src/components/home-magazine/TopContenders.tsx` | `design-handoff/top-contenders.jsx` | ⏳ pending | 夺冠热门 |

> Shared primitives: `design-handoff/visual-system.jsx` 是新设计的视觉系统（颜色 / typography / 卡片样式），所有 home-magazine 组件都应该 reference 它。
> `design-handoff/tweaks-panel.jsx` 是设计工具面板（调色板/字号开关），N/A — 不迁移。
> `design-handoff/team-data.jsx` 是 demo 数据/types，N/A — 我们用真实的 Supabase queries。

### live-match/ — 比赛进行中

| Old / Existing | New design source | Status | Notes |
|---|---|---|---|
| `src/components/live-match/LiveLeaderboard.tsx` | N/A | ⏸ no-design | export 里没 live-match 设计 — 保留现有 |
| `src/components/live-match/LiveMatchHeader.tsx` | N/A | ⏸ no-design | 保留现有 |
| `src/components/live-match/LiveMatchStats.tsx` | N/A | ⏸ no-design | 保留现有 |
| `src/components/live-match/MatchCommentSection.tsx` | N/A | ⏸ no-design | 保留现有 |
| `src/components/live-match/MatchInteractionHub.tsx` | N/A | ⏸ no-design | 保留现有 |
| `src/components/live-match/MatchPollWidget.tsx` | N/A | ⏸ no-design | 保留现有 |
| `src/components/live-match/MatchReactionBar.tsx` | N/A | ⏸ no-design | 保留现有 |

### team/ — 球队组件

`team-detail.jsx` (40 KB) 和 `team-list.jsx` (16 KB) 是页面级布局，归 Page mapping 处理：
- `team-detail.jsx` → `/en/teams/[teamId]` (见 Page mapping)
- `team-list.jsx` → `/en/teams` (见 Page mapping)

页面迁移过程中如果发现 `src/components/team/*` 里某个组件被新 layout 复用，可在那一轮顺带改 testid 兼容，但**不要把 team 子组件单独排进 loop**——否则会和页面级迁移产生冲突。

### 其他组件目录（design export 没覆盖）

```
src/components/
├── analytics/      N/A — 无 design，保留现有
├── blog/           N/A — 无 design
├── chat/           N/A — 无 design
├── compare/        N/A — 无 design
├── fan-card/       N/A — 无 design
├── formations/     N/A — 无 design
├── odds/           N/A — 无 design（Polymarket / 庄家 UI 留作后续）
├── pk-battle/      N/A — 无 design
├── player/         N/A — 无 design
├── predict/        N/A — 无 design（ML 预测 UI 留作后续）
├── quiz/           N/A — 无 design
├── signals/        N/A — 无 design
└── ui/             保留现有（设计系统 primitives）— visual-system.jsx 的 token 可参考但不强制替换
```

## Page mapping (含 /en locale prefix)

| Route | New design source | Status |
|---|---|---|
| `/en` (home) | `design-handoff/home.html` | ⏳ pending |
| `/en/matches` | N/A | ⏸ no-design |
| `/en/matches/live/[matchId]` | N/A | ⏸ no-design |
| `/en/teams` | `design-handoff/teams.html` | ⏳ pending |
| `/en/teams/[teamId]` | `design-handoff/team-detail.html` | ⏳ pending |
| `/en/teams/qualified` | N/A | ⏸ no-design |
| `/en/power-rankings` | N/A | ⏸ no-design |
| `/en/predictions` | N/A | ⏸ no-design |
| `/en/schedule` | N/A | ⏸ no-design |
| `/en/bracket` | N/A | ⏸ no-design |
| `/en/leaderboard` | N/A | ⏸ no-design |
| `/en/groups` | N/A | ⏸ no-design |
| `/en/cities` | N/A | ⏸ no-design |
| `/en/blog` | N/A | ⏸ no-design |
| `/en/about` | N/A | ⏸ no-design |
| `/auth/login` | N/A | ⏸ no-design |

> Bonus reference: `design-handoff/home-hero-variant.html` 是 homepage 的 hero-only 变体（89 行 vs full 368），可作为 HeroA 的次要参考。

---

## Rules (implementer 必须遵守)

### 必做
- 取新 UI 的：JSX 结构、Tailwind classes、布局、动效
- 保留旧的：Supabase queries、TypeScript 类型、props 接口、所有 `use*` hooks
- 默认按 **Server Component** 迁移，只有需要 `onClick` / `useState` / `useEffect` 的才加 `'use client'`
- 保留所有 `data-testid` 属性（`tests/e2e/_helpers/test-ids.ts` 是契约）
- 每个组件完成后 commit 一次：`migrate: <ComponentPath>`

### 禁止
- ❌ 改 Supabase queries（包括字段名、表名、filter 条件）
- ❌ 改 TypeScript 类型定义
- ❌ 改组件 props 接口
- ❌ 删 `data-testid` 属性
- ❌ 删现有测试
- ❌ 把 Server Component 全部转成 Client Component（贪图省事）
- ❌ 引入新依赖（除非新 UI 明确需要，commit message 里说明）

### 已知 schema 细节（基于 supabase/migrations/）
- 比赛状态枚举：`scheduled` / `live` / `completed` / `postponed` / `cancelled`（不是 upcoming/finished）
- 比赛时间字段：`matches.kickoff_utc`（不是 kickoff_at）
- xG 在 **team_stats**（赛季级），不在 matches 表
- ELO 在 **teams.elo_rating** + **teams.elo_rank**（无单独 elo 表）
- 预测在 **predictions** 表，字段：home_win_prob / draw_prob / away_win_prob / confidence_score / recommended_pick
- 球队 id 是 uuid，用 slug 作为 URL 标识（brazil / argentina / ...）

### i18n
- 用 `next-intl` + `localePrefix: 'always'`
- 所有非 auth route 都有 `/[locale]` 前缀
- 测试用 `/en`，组件迁移不动 i18n 逻辑

### Server vs Client component 决策树
```
新组件用了 onClick / onChange / useState / useEffect / browser API？
  └─ 是 → 'use client'
  └─ 否 → 默认 Server Component（async function + 直接 await supabase）
```

---

## 状态记录（loop 跑的时候会自动更新）

最后一次完成的组件：_(loop 会填)_
最后一次 verify 结果：_(loop 会填)_
被 blocked 的组件：_(loop 会填，需要人工处理)_
