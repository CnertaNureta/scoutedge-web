/**
 * tests/e2e/auth.spec.ts
 *
 * Auth flow 测试。Supabase Auth 用 @supabase/ssr，cookies-based。
 *
 * 这些测试 mock auth response——不是真测试 Supabase Auth，
 * 而是验证迁移后 UI 还在按预期 dispatch login 请求和处理结果。
 */
import { test, expect } from '@playwright/test';
import { TEST_IDS } from './_helpers/test-ids';

test.describe('Login flow', () => {
  test('显示 login form 全部字段', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByTestId(TEST_IDS.loginForm)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.loginEmail)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.loginPassword)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.loginSubmit)).toBeVisible();
  });

  test('提交成功 → redirect 到首页', async ({ page }) => {
    // Mock Supabase auth response
    await page.route('**/auth/v1/token**', async (route) => {
      return route.fulfill({
        json: {
          access_token: 'mock-jwt-token',
          refresh_token: 'mock-refresh',
          token_type: 'bearer',
          expires_in: 3600,
          user: { id: 'user-1', email: 'test@scoutedge.ai' },
        },
      });
    });

    await page.goto('/login');
    await page.getByTestId(TEST_IDS.loginEmail).fill('test@scoutedge.ai');
    await page.getByTestId(TEST_IDS.loginPassword).fill('password123');
    await page.getByTestId(TEST_IDS.loginSubmit).click();

    // 期望 redirect 到 /（或 /dashboard，按你实际行为改）
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 5_000 });
  });

  test('错误凭证 → 显示错误信息', async ({ page }) => {
    await page.route('**/auth/v1/token**', async (route) => {
      return route.fulfill({
        status: 400,
        json: { error: 'invalid_grant', error_description: 'Invalid credentials' },
      });
    });

    await page.goto('/login');
    await page.getByTestId(TEST_IDS.loginEmail).fill('wrong@scoutedge.ai');
    await page.getByTestId(TEST_IDS.loginPassword).fill('wrongpass');
    await page.getByTestId(TEST_IDS.loginSubmit).click();

    await expect(page.getByTestId(TEST_IDS.loginError)).toBeVisible();
  });

  test('空字段 → 浏览器原生验证（或自定义错误）', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId(TEST_IDS.loginSubmit).click();

    // 还在 /login（没提交成功）
    await expect(page).toHaveURL(/\/login/);
  });
});

// TODO: 加 logout flow / protected route redirect 测试
// 受保护路由的测试需要先 mock auth state，可以在 beforeEach 里 setCookies
