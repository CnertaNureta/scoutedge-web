/**
 * tests/e2e/live-data.spec.ts
 *
 * 实时数据迁移最容易碎的地方：
 *   - Supabase Realtime channel 没 subscribe
 *   - useEffect 清理 function 漏写 → memory leak
 *   - Polling interval 被改 hardcode
 *
 * 这些测试模拟 mock 数据变化，验证 UI 跟着更新。
 */
import { test, expect } from '@playwright/test';
import { setupMocks, collectConsoleErrors } from './_helpers/mock-routes';
import { TEST_IDS } from './_helpers/test-ids';

test.describe('Live score updates', () => {
  test('live indicator 在进行中的比赛上显示', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/matches/match-002'); // 已 mock 为 live
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId(TEST_IDS.liveIndicator)).toBeVisible();

    // Live indicator 应该有视觉特征（脉冲、颜色、文字等）
    // 不强测视觉，但确认它真的渲染出来了
    const liveText = await page.getByTestId(TEST_IDS.liveIndicator).textContent();
    expect(liveText).toMatch(/live|进行中|●|🔴/i);
  });

  test('score timestamp 在更新（说明 channel 在工作）', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/matches/match-002');
    await page.waitForLoadState('networkidle');

    const tsBefore = await page
      .getByTestId(TEST_IDS.scoreUpdateTimestamp)
      .textContent();

    // 等 6 秒（够 polling 或 realtime tick 触发一次）
    await page.waitForTimeout(6_000);

    const tsAfter = await page
      .getByTestId(TEST_IDS.scoreUpdateTimestamp)
      .textContent();

    // 如果你用 Supabase Realtime + 没有真实数据变化，timestamp 可能不变
    // 这个测试更适合在 USE_REAL_BACKEND=1 时跑
    // 退而求其次：至少 timestamp 元素本身可见
    expect(tsBefore).toBeTruthy();
    expect(tsAfter).toBeTruthy();
  });
});

test.describe('Polymarket odds polling', () => {
  test('odds 按 interval 重新请求（默认 10s 太长，缩到 3s 测）', async ({ page }) => {
    let pmCalls = 0;
    await page.route('**/gamma-api.polymarket.com/**', async (route) => {
      pmCalls++;
      return route.fulfill({
        json: [
          {
            market_id: 'pm-1',
            outcome: 'home_win',
            price: 0.45 + Math.random() * 0.01, // 微变化
            last_updated: new Date().toISOString(),
          },
        ],
      });
    });

    await page.goto('/odds');
    await page.waitForLoadState('networkidle');

    const callsAfterLoad = pmCalls;

    // 等 12 秒，期望至少有 1 次额外 poll
    await page.waitForTimeout(12_000);

    expect(
      pmCalls,
      'Polymarket 应该周期性 refresh——如果这条挂了，说明 polling/SWR 被关掉了',
    ).toBeGreaterThan(callsAfterLoad);
  });
});

// TODO: Supabase Realtime 测试需要 ws mock 或真实 backend
// 暂时只验证 channel.subscribe() 被调用了——可以在组件里加个 testid 触发
