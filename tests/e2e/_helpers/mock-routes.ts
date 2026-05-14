/**
 * tests/e2e/_helpers/mock-routes.ts
 *
 * 拦截 Supabase 和 Polymarket 的网络请求，返回 fixture 数据。
 *
 * 在每个 test 开头调用 setupMocks(page)，loop 跑就稳定。
 *
 * USE_REAL_BACKEND=1 npx playwright test 跳过 mock，打真实后端。
 */
import { Page } from '@playwright/test';
import {
  MOCK_TEAMS,
  MOCK_MATCHES,
  MOCK_PREDICTIONS,
  MOCK_TEAM_STATS,
  MOCK_STANDINGS,
  MOCK_POLYMARKET_ODDS,
} from './mock-data';

const USE_REAL = process.env.USE_REAL_BACKEND === '1';

export async function setupMocks(page: Page) {
  if (USE_REAL) return; // 跳过所有 mock

  await page.route('**/api/leaderboard/global**', async (route) => {
    return route.fulfill({
      json: {
        leaderboard: [],
        limit: 100,
        offset: 0,
      },
    });
  });

  // ──────────────────────────────────────────────
  // Supabase REST: https://<project>.supabase.co/rest/v1/<table>?...
  // 拦所有 *.supabase.co 的请求
  // ──────────────────────────────────────────────
  await page.route('**/*.supabase.co/**', async (route, request) => {
    const url = new URL(request.url());

    // /rest/v1/teams
    if (url.pathname.includes('/rest/v1/teams')) {
      return route.fulfill({ json: filterByQuery(MOCK_TEAMS, url) });
    }
    // /rest/v1/matches
    if (url.pathname.includes('/rest/v1/matches')) {
      return route.fulfill({ json: filterByQuery(MOCK_MATCHES, url) });
    }
    // /rest/v1/predictions（match_outcome / 三概率 / recommended_pick）
    if (url.pathname.includes('/rest/v1/predictions')) {
      return route.fulfill({ json: filterByQuery(MOCK_PREDICTIONS, url) });
    }
    // /rest/v1/team_stats（赛季级 xG / power_score / 控球率等）
    if (url.pathname.includes('/rest/v1/team_stats')) {
      return route.fulfill({ json: filterByQuery(MOCK_TEAM_STATS, url) });
    }
    // /rest/v1/standings（小组排名 + qualification_status）
    if (url.pathname.includes('/rest/v1/standings')) {
      return route.fulfill({ json: filterByQuery(MOCK_STANDINGS, url) });
    }
    // /auth/v1/* — 让 auth 测试单独处理
    if (url.pathname.startsWith('/auth/v1/')) {
      return route.continue();
    }

    // 默认返回空数组（避免未 mock 的请求让组件挂掉）
    return route.fulfill({ json: [] });
  });

  // ──────────────────────────────────────────────
  // Polymarket Gamma API
  // 真实 endpoint: https://gamma-api.polymarket.com/markets?...
  // ──────────────────────────────────────────────
  await page.route('**/gamma-api.polymarket.com/**', async (route) => {
    return route.fulfill({ json: MOCK_POLYMARKET_ODDS });
  });

  // 如果你用 CLOB API，加这行：
  // await page.route('**/clob.polymarket.com/**', ...);
}

/**
 * 极简的 ?column=eq.value 过滤——够 mock 用，不要当成真 Supabase。
 */
function filterByQuery<T extends Record<string, unknown>>(rows: T[], url: URL): T[] {
  let result = [...rows];
  for (const [key, val] of url.searchParams.entries()) {
    if (key === 'select' || key === 'order' || key === 'limit') continue;
    const match = val.match(/^eq\.(.+)$/);
    if (match) {
      const target = match[1];
      result = result.filter((row) => String(row[key]) === target);
    }
  }
  return result;
}

/**
 * 监听 console 错误。在测试结尾断言数组是空的。
 * 用法：
 *   const errors = collectConsoleErrors(page);
 *   await page.goto('/');
 *   expect(errors).toEqual([]);
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}
