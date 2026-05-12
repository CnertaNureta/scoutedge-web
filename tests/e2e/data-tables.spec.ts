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

test.describe('ELO ranking', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('显示所有球队，按 ELO 降序', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('/elo');
    await page.waitForLoadState('networkidle');

    const rows = page.getByTestId(TEST_IDS.eloRow);
    await expect(rows).toHaveCount(5); // mock 里有 5 队

    // 默认应该按 ELO 降序：Brazil (2050) 第一
    const firstRow = rows.first();
    await expect(firstRow).toContainText(/Brazil|BRA/);

    // ELO 数字看起来对（2000 附近）
    const firstRating = await firstRow.getByTestId(TEST_IDS.eloRating).textContent();
    expect(firstRating).toMatch(/20[0-9]{2}/);

    expect(errors).toEqual([]);
  });

  test('点击 sort 按钮反转顺序', async ({ page }) => {
    await page.goto('/elo');
    await page.waitForLoadState('networkidle');

    const firstRowBefore = await page
      .getByTestId(TEST_IDS.eloRow)
      .first()
      .textContent();

    await page.getByTestId(TEST_IDS.eloSortButton).click();

    const firstRowAfter = await page
      .getByTestId(TEST_IDS.eloRow)
      .first()
      .textContent();

    expect(firstRowAfter).not.toBe(firstRowBefore);
  });
});

test.describe('Odds table (Polymarket)', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('显示三个 outcomes 和最后更新时间', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('/odds');
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
    await page.goto('/odds');
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
