/**
 * tests/e2e/match-detail.spec.ts
 *
 * Match detail page 是 ScoutEdge 价值密度最高的页面——
 * 比分、xG、ELO、Polymarket、三层概率综合全在这里。
 *
 * 测试目标：迁移后这些元素都还在、数据流通。
 */
import { test, expect } from '@playwright/test';
import { setupMocks, collectConsoleErrors } from './_helpers/mock-routes';
import { TEST_IDS } from './_helpers/test-ids';

test.describe('Match detail page', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('upcoming match: 显示队名、kickoff 时间、三层概率', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto('/matches/match-001'); // BR vs AR upcoming
    await page.waitForLoadState('networkidle');

    // 队名可见
    await expect(page.getByTestId(TEST_IDS.matchHomeTeam)).toContainText(/Brazil|BRA/);
    await expect(page.getByTestId(TEST_IDS.matchAwayTeam)).toContainText(/Argentina|ARG/);

    // 状态正确
    await expect(page.getByTestId(TEST_IDS.matchStatus)).toContainText(/upcoming|未开始/i);

    // Probability widget 完整三层
    const widget = page.getByTestId(TEST_IDS.probabilityWidget);
    await expect(widget).toBeVisible();
    await expect(widget.getByTestId(TEST_IDS.probabilityMl)).toBeVisible();
    await expect(widget.getByTestId(TEST_IDS.probabilityPolymarket)).toBeVisible();
    await expect(widget.getByTestId(TEST_IDS.probabilitySportsbook)).toBeVisible();
    await expect(widget.getByTestId(TEST_IDS.probabilitySynthesis)).toBeVisible();

    // 数字格式合理：0-100% 或 0.00-1.00
    const synthesisText = await widget.getByTestId(TEST_IDS.probabilitySynthesis).textContent();
    expect(synthesisText).toMatch(/\d+\.?\d*\s*%|0\.\d{2,}/);

    expect(errors).toEqual([]);
  });

  test('live match: 显示比分和 live 指示器', async ({ page }) => {
    await page.goto('/matches/match-002'); // FR vs EN live
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId(TEST_IDS.matchScore)).toContainText(/1.*0|1-0|1 - 0/);
    await expect(page.getByTestId(TEST_IDS.matchStatus)).toContainText(/live|进行中/i);
    await expect(page.getByTestId(TEST_IDS.liveIndicator)).toBeVisible();

    // xG 应该可见（实时计算的）
    await expect(page.getByTestId(TEST_IDS.matchXg)).toBeVisible();
  });

  test('finished match: 显示最终比分和 xG', async ({ page }) => {
    await page.goto('/matches/match-003'); // ES vs BR finished 2-2
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId(TEST_IDS.matchScore)).toContainText(/2.*2|2-2|2 - 2/);
    await expect(page.getByTestId(TEST_IDS.matchStatus)).toContainText(/finished|结束|FT/i);

    const xgText = await page.getByTestId(TEST_IDS.matchXg).textContent();
    expect(xgText).toMatch(/1\.\d|2\.\d/); // 大约 1.9 和 2.1
  });

  test('未找到的 match: 显示 404 或 not found，不崩', async ({ page }) => {
    const response = await page.goto('/matches/this-id-doesnt-exist');
    // Next.js 404 page 或 client-side empty state，两者都可以
    if (response?.status() === 404) {
      // good
    } else {
      await expect(page.locator('text=/not found|找不到|404/i')).toBeVisible();
    }
  });
});
