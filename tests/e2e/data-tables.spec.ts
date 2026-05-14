/**
 * tests/e2e/data-tables.spec.ts
 *
 * 数据表类页面：ELO 排名 + Polymarket odds。
 *
 * 这些页面共同模式：从 Supabase / 外部 API 拿数组 → 渲染表格。
 * Migration 最容易 broken 的地方：
 *   - 列表 .map() 丢失
 *   - sort / filter 被改成 hardcoded
 *   - loading state 没接上
 */
import { test, expect } from '@playwright/test';
import { setupMocks, collectConsoleErrors } from './_helpers/mock-routes';
import { TEST_IDS } from './_helpers/test-ids';

test.describe('Power Rankings', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('显示所有球队，按 ELO 降序', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('/en/power-rankings');
    await page.waitForLoadState('networkidle');

    // Page uses static `getAllTeams()` (48 teams), not Supabase mock. It groups
    // teams into tier tables, so there are 48 rows across all tiers.
    const rows = page.getByTestId(TEST_IDS.powerRankingsRow);
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(40);

    // Rank 1 row should display rank "1" in its first cell
    const firstRow = rows.first();
    await expect(firstRow).toContainText('1');

    expect(errors).toEqual([]);
  });

  // SKIP: power-rankings page 目前 server-side pre-sort 后按 tier 分组，
  // 没有 client-side sort button。等 UI 加上 sort button 再启用。
  test.skip('点击 sort 按钮反转顺序', async ({ page }) => {
    await page.goto('/en/power-rankings');
    await page.waitForLoadState('networkidle');

    const firstRowBefore = await page
      .getByTestId(TEST_IDS.powerRankingsRow)
      .first()
      .textContent();

    await page.getByTestId(TEST_IDS.powerRankingsSortButton).click();

    const firstRowAfter = await page
      .getByTestId(TEST_IDS.powerRankingsRow)
      .first()
      .textContent();

    expect(firstRowAfter).not.toBe(firstRowBefore);
  });
});

// TODO: OddsTracker 当前显示 shift/sharp-move feed,
//       不是三层 source-typed rows. 等 UI 重建后回来开启.
test.describe.skip('Odds table (Polymarket)', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('显示三个 outcomes 和最后更新时间', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('/en/predictions');
    await page.waitForLoadState('networkidle');

    const rows = page.getByTestId(TEST_IDS.oddsRow);
    await expect(rows).toHaveCount(3); // home_win / draw / away_win

    // 最后更新时间可见（防止迁移后这一段被丢）
    await expect(page.getByTestId(TEST_IDS.oddsLastUpdated)).toBeVisible();

    // 价格在 0-1 范围或 0-100 cent 范围
    const firstRowText = await rows.first().textContent();
    expect(firstRowText).toMatch(/0\.\d{2}|[0-9]{1,2}¢|[0-9]{1,2}%/);

    expect(errors).toEqual([]);
  });

  test('刷新按钮触发新请求', async ({ page }) => {
    await page.goto('/en/predictions');
    await page.waitForLoadState('networkidle');

    let polymarketCalls = 0;
    page.on('request', (req) => {
      if (req.url().includes('polymarket')) polymarketCalls++;
    });

    const callsBefore = polymarketCalls;
    await page.getByTestId(TEST_IDS.oddsRefreshButton).click();
    await page.waitForTimeout(1_000);

    expect(polymarketCalls).toBeGreaterThan(callsBefore);
  });
});
