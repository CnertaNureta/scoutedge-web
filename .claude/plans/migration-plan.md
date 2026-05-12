# UI Migration Plan — ScoutEdge

> 这个文件是迁移**进度状态**的单一来源。验收**标准**在 `scripts/verify.sh`。

## Component mapping

> 下表基于真实 `src/components/` 目录结构。
> `New design source` 列你自己对照 Claude Design 导出的 zip 填——找不到对应的标 `N/A`。
> 状态：⏳ pending → 🔄 in progress → ✅ done / ⚠️ blocked

### home-magazine/ — 杂志式首页

| Old / Existing | New design source | Status | Notes |
|---|---|---|---|
| `src/components/home-magazine/HeroA.tsx` | TODO | ⏳ pending | 首屏 hero |
| `src/components/home-magazine/HeroLiveCard.tsx` | TODO | ⏳ pending | 首屏 live 比赛卡 |
| `src/components/home-magazine/HeroLiveTicker.tsx` | TODO | ⏳ pending | 滚动比分 ticker |
| `src/components/home-magazine/MagazineHomePage.tsx` | TODO | ⏳ pending | 整页 layout |
| `src/components/home-magazine/MoreModules.tsx` | TODO | ⏳ pending | 模块入口 |
| `src/components/home-magazine/NextMatch.tsx` | TODO | ⏳ pending | 下一场比赛卡 |
| `src/components/home-magazine/TopContenders.tsx` | TODO | ⏳ pending | 夺冠热门 |

### live-match/ — 比赛进行中

| Old / Existing | New design source | Status | Notes |
|---|---|---|---|
| `src/components/live-match/LiveLeaderboard.tsx` | TODO | ⏳ pending | 实时排行 |
| `src/components/live-match/LiveMatchHeader.tsx` | TODO | ⏳ pending | 比分 header |
| `src/components/live-match/LiveMatchStats.tsx` | TODO | ⏳ pending | 实时数据 |
| `src/components/live-match/MatchCommentSection.tsx` | TODO | ⏳ pending | 评论区 |
| `src/components/live-match/MatchInteractionHub.tsx` | TODO | ⏳ pending | 互动入口 |
| `src/components/live-match/MatchPollWidget.tsx` | TODO | ⏳ pending | 投票组件 |
| `src/components/live-match/MatchReactionBar.tsx` | TODO | ⏳ pending | 表情回应 |

### 其他组件目录（按需添加，建议先专注上面两个最关键的）

```
src/components/
├── analytics/      ⏳ TODO 列出
├── blog/           ⏳ TODO 列出
├── chat/           ⏳ TODO 列出
├── compare/        ⏳ TODO 列出
├── fan-card/       ⏳ TODO 列出
├── formations/     ⏳ TODO 列出
├── odds/           ⏳ TODO 列出（Polymarket / 庄家 UI）
├── pk-battle/      ⏳ TODO 列出
├── player/         ⏳ TODO 列出
├── predict/        ⏳ TODO 列出（ML 预测 UI）
├── quiz/           ⏳ TODO 列出
├── signals/        ⏳ TODO 列出
├── team/           ⏳ TODO 列出
└── ui/             ⏳ TODO 列出（设计系统 primitives）
```

## Page mapping (含 /en locale prefix)

| Route | New design source | Status |
|---|---|---|
| `/en` (home) | `design-handoff/home.html` | ⏳ pending |
| `/en/matches` | `design-handoff/matches.html` | ⏳ pending |
| `/en/matches/live/[matchId]` | `design-handoff/match-detail.html` | ⏳ pending |
| `/en/teams` | `design-handoff/teams.html` | ⏳ pending |
| `/en/teams/[teamId]` | `design-handoff/team-detail.html` | ⏳ pending |
| `/en/teams/qualified` | `design-handoff/teams-qualified.html` | ⏳ pending |
| `/en/power-rankings` | `design-handoff/power-rankings.html` | ⏳ pending |
| `/en/predictions` | `design-handoff/predictions.html` | ⏳ pending |
| `/en/schedule` | `design-handoff/schedule.html` | ⏳ pending |
| `/en/bracket` | `design-handoff/bracket.html` | ⏳ pending |
| `/en/leaderboard` | `design-handoff/leaderboard.html` | ⏳ pending |
| `/en/groups` | `design-handoff/groups.html` | ⏳ pending |
| `/en/cities` | `design-handoff/cities.html` | ⏳ pending |
| `/en/blog` | `design-handoff/blog.html` | ⏳ pending |
| `/en/about` | `design-handoff/about.html` | ⏳ pending |
| `/auth/login` | `design-handoff/login.html` | ⏳ pending |

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
