/**
 * tests/e2e/smoke.spec.ts
 *
 * 全站冒烟测试：每个 route 都能加载、不崩、没有 console error。
 * 这是 migration loop 最重要的一关——抓 90% 的"换了 UI 但忘 wire 数据"问题。
 *
 * 跑一遍 ~30s，但价值密度极高。
 */
import { test, expect } from '@playwright/test';
import { setupMocks, collectConsoleErrors } from './_helpers/mock-routes';

// Next.js App Router 这个 repo 用 next-intl，localePrefix: 'always'
// 所有页面都在 src/app/[locale]/ 下，必须带 locale prefix（默认 /en）
// 例外：/auth/* 在 [locale] 外面
const PUBLIC_ROUTES = [
  { path: '/en', name: 'home' },
  { path: '/en/matches', name: 'matches list' },
  { path: '/en/matches/live/match-001', name: 'match live detail' },
  { path: '/en/teams', name: 'teams list' },
  { path: '/en/teams/brazil', name: 'team detail' },
  { path: '/en/teams/brazil/qualified', name: 'team qualified' },
  { path: '/en/power-rankings', name: 'power rankings (ELO)' },
  { path: '/en/predictions', name: 'predictions / odds' },
  { path: '/en/schedule', name: 'schedule' },
  { path: '/en/bracket', name: 'bracket' },
  { path: '/en/leaderboard', name: 'leaderboard' },
  { path: '/en/groups/A', name: 'group page' },
  { path: '/en/cities', name: 'cities list' },
  { path: '/en/blog', name: 'blog index' },
  { path: '/en/about', name: 'about' },
  { path: '/auth/login', name: 'login' },
];

for (const route of PUBLIC_ROUTES) {
  test(`smoke: ${route.name} (${route.path}) loads cleanly`, async ({ page }) => {
    await setupMocks(page);
    const errors = collectConsoleErrors(page);

    const response = await page.goto(route.path);
    expect(response?.status(), `${route.path} returned non-2xx`).toBeLessThan(400);

    // 等到 DOM 静下来（暗示 hydration 完成）
    await page.waitForLoadState('networkidle');

    // 没有 console error
    // ⚠️ 如果某些 lib（比如 Sentry）正常情况下也 log error，在这里 filter 掉
    const realErrors = errors.filter((e) => !e.includes('ResizeObserver'));
    expect(realErrors, `${route.path} 有 console error`).toEqual([]);

    // 页面有 <main> 或者 <h1>，说明没整体崩
    const hasMainContent = await page
      .locator('main, [role="main"], h1')
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    expect(hasMainContent, `${route.path} 没有可见主内容`).toBe(true);
  });
}
