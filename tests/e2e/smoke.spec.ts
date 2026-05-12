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

const PUBLIC_ROUTES = [
  { path: '/', name: 'home' },
  { path: '/matches', name: 'matches list' },
  { path: '/matches/match-001', name: 'match detail' },
  { path: '/teams', name: 'teams list' },
  { path: '/teams/br', name: 'team detail' },
  { path: '/elo', name: 'ELO ranking' },
  { path: '/odds', name: 'odds table' },
  { path: '/login', name: 'login' },
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
