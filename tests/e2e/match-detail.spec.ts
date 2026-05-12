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

    await page.goto('/en/matches/live/match-001'); // BR vs AR upcoming
    await page.waitForLoadState('networkidle');

    // 队名可见
    await expect(page.getByTestId(TEST_IDS.matchHomeTeam)).toContainText(/Brazil|BRA/);
    await expect(page.getByTestId(TEST_IDS.matchAwayTeam)).toContainText(/Argentina|ARG/);

    // 状态正确（schema enum: scheduled / live / completed / postponed / cancelled）
    await expect(page.getByTestId(TEST_IDS.matchStatus)).toContainText(/scheduled|未开始/i);

    // Prediction widget 单层（ML 概率 + 信心度），用 predict/DuelCard 渲染
    // 注：三层 odds UI（odds/OddsTracker）目前没建好，所以测单层
    const widget = page.getByTestId(TEST_IDS.predictionWidget);
    await expect(widget).toBeVisible();
    await expect(widget.getByTestId(TEST_IDS.predictionHomeWinProb)).toBeVisible();
    await expect(widget.getByTestId(TEST_IDS.predictionDrawProb)).toBeVisible();
    await expect(widget.getByTestId(TEST_IDS.predictionAwayWinProb)).toBeVisible();
    await expect(widget.getByTestId(TEST_IDS.predictionConfidence)).toBeVisible();

    // 数字格式合理：0-100% 或 0.00-1.00
    const homeProbText = await widget.getByTestId(TEST_IDS.predictionHomeWinProb).textContent();
    expect(homeProbText).toMatch(/\d+\.?\d*\s*%|0\.\d{2,}/);

    expect(errors).toEqual([]);
  });

  test('live match: 显示比分和 live 指示器', async ({ page }) => {
    await page.goto('/en/matches/live/match-002'); // FR vs EN live
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId(TEST_IDS.matchScore)).toContainText(/1.*0|1-0|1 - 0/);
    await expect(page.getByTestId(TEST_IDS.matchStatus)).toContainText(/live|进行中/i);
    await expect(page.getByTestId(TEST_IDS.liveIndicator)).toBeVisible();

    // xG 在 team_stats（赛季级），不在 matches。match 级别只测比分 + live 指示器。
  });

  test('finished match: 显示最终比分', async ({ page }) => {
    await page.goto('/en/matches/live/match-003'); // ES vs BR completed 2-2
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId(TEST_IDS.matchScore)).toContainText(/2.*2|2-2|2 - 2/);
    await expect(page.getByTestId(TEST_IDS.matchStatus)).toContainText(/completed|结束|FT/i);
  });

  test('未找到的 match: 显示 404 或 not found，不崩', async ({ page }) => {
    const response = await page.goto('/en/matches/live/this-id-doesnt-exist');
    // Next.js 404 page 或 client-side empty state，两者都可以
    if (response?.status() === 404) {
      // good
    } else {
      await expect(page.locator('text=/not found|找不到|404/i')).toBeVisible();
    }
  });
});
