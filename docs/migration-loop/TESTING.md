# ScoutEdge Playwright Test Templates

为 UI migration loop 设计的关键路径测试。**默认 mock 后端**，跑得快、能在 CI 跑。

## 文件结构

```
playwright.config.ts                          ← 单 worker 顺序跑，自动启 dev server
tests/e2e/
├── _helpers/
│   ├── test-ids.ts                           ← 所有 data-testid 单一来源（必看）
│   ├── mock-data.ts                          ← Fixture 数据（teams/matches/probabilities）
│   └── mock-routes.ts                        ← 拦截 Supabase + Polymarket 请求
├── smoke.spec.ts                             ← 8 个 route 都能加载 (最高 ROI)
├── match-detail.spec.ts                      ← 比分 / xG / 三层概率
├── data-tables.spec.ts                       ← ELO 排名 + Polymarket odds 表
├── auth.spec.ts                              ← 登录流程
└── live-data.spec.ts                         ← Realtime / polling
```

## 装

```bash
# 在 ScoutEdge repo 根目录
cd ~/path/to/scoutedge
tar xf ~/Downloads/scoutedge-playwright.tar -C /tmp/
cp -r /tmp/scoutedge-playwright/. .

# 装 Playwright
npm i -D @playwright/test
npx playwright install chromium

# 验证
npx playwright test --list   # 应该列出 20+ 个测试
```

## package.json scripts（建议加进去）

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:real": "USE_REAL_BACKEND=1 playwright test",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

## 跑

```bash
# 默认 mock 模式（用 fixture 数据）
npx playwright test

# 跑单个文件
npx playwright test smoke

# UI 模式（可视化 debug）
npx playwright test --ui

# 打真实后端（需要 .env.local 配好 Supabase）
USE_REAL_BACKEND=1 npx playwright test
```

## **跑之前必做：在组件里加 testid**

测试用 `data-testid` 而不是 class/text，因为 class 会随 Tailwind 改变。

### Migration implementer 的硬规则

在 `.claude/agents/migration-implementer.md` 的 **禁止** 部分追加：

> ❌ 不要删除任何 `data-testid` 属性。新 UI 里的关键元素必须沿用旧组件的 testId。`tests/e2e/_helpers/test-ids.ts` 是契约。

### Testid 加在哪里

打开 `tests/e2e/_helpers/test-ids.ts`，对照每一个 ID 找对应组件加上。例：

```tsx
// src/components/MatchCard.tsx
import { TEST_IDS } from '@/tests/e2e/_helpers/test-ids';

export function MatchCard({ match }) {
  return (
    <div data-testid={TEST_IDS.matchCard}>
      <span data-testid={TEST_IDS.matchHomeTeam}>{match.home.name}</span>
      <span data-testid={TEST_IDS.matchScore}>
        {match.home_score} - {match.away_score}
      </span>
      <span data-testid={TEST_IDS.matchAwayTeam}>{match.away.name}</span>
    </div>
  );
}
```

## Mock data 怎么改

**实际 schema 不一样？**：改 `_helpers/mock-data.ts` 的字段名匹配你 Supabase 表。

**Polymarket 字段不对？**：改 `_helpers/mock-data.ts` 里 `MOCK_POLYMARKET_ODDS`。我猜的是 Gamma API 格式（`market_id`, `outcome`, `price`）——你看实际 response 是什么。

## 我猜对了什么 / 没猜对什么

我没有你 repo 的访问权，所以下面这些是**推测**，你必须 verify：

| 我猜的 | 改的地方 |
|---|---|
| Routes：`/matches/[id]`、`/elo`、`/odds` 等 | `smoke.spec.ts` 里的 `PUBLIC_ROUTES` |
| Supabase 表名：`teams`、`matches`、`probabilities`、`four_factors` | `mock-routes.ts` 里的路由匹配 |
| 字段名：`home_team_id`、`elo_rating`、`home_xg` 等 | `mock-data.ts` |
| Match status 枚举：`upcoming` / `live` / `finished` | `mock-data.ts` |
| Polymarket API 是 Gamma 而非 CLOB | `mock-routes.ts` |
| Login form 字段：email + password | `auth.spec.ts` |
| 三层概率结构：ML / Polymarket / sportsbook / synthesis | `test-ids.ts` 和 `mock-data.ts` |

跑第一遍预期会挂一大堆——把 `--reporter=list` 输出贴给我，我帮你按实际情况调整。

## 集成到 verify.sh

迁移 loop bundle 里的 `scripts/verify.sh` 已经会跑 `npx playwright test`——不用改。

唯一需要的是确保 `tests/e2e/` 目录存在（verify.sh 会检查这个，没有就 fail）。

## 接下来扩展（不急但有用）

- [ ] **Visual regression**：`page.screenshot()` + `toMatchSnapshot()` 抓视觉漂移
- [ ] **Mobile viewport**：取消 playwright.config 里 `mobile` project 的注释
- [ ] **A11y check**：`@axe-core/playwright` 跑可访问性
- [ ] **Lighthouse CI**：性能 budget
- [ ] **Migration completeness check**：grep `src/` 看还有没有旧组件痕迹

## 故障排查

**"timeout waiting for testId xxx"**：
- 组件里没加 testid，或者 testid 名字不一致
- 检查 `_helpers/test-ids.ts` 里的字符串和组件里的是否完全相同

**"net::ERR_FAILED" 全屏**：
- Next.js dev server 没起来。手动 `npm run dev` 看 port 3000 能不能访问

**"page errored: Hydration mismatch"**：
- Server Component 返回的 HTML 和 client 渲染的不一致。常见于迁移后误把 Server Component 转成 Client 但保留了 server-only API

**所有 smoke 都过但 match-detail 挂**：
- 多半是新 UI 把动态数据 hardcode 了。grep 新组件文件找 `2050`（mock ELO）、`Brazil`、`0.42` 这种字面量，应该被 `{...}` 替换
