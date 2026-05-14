import { defineConfig, devices } from '@playwright/test';

/**
 * ScoutEdge Playwright config
 *
 * 默认 mock 后端（Supabase + Polymarket），跑得快、CI 友好。
 * 想跑真实后端：USE_REAL_BACKEND=1 npx playwright test
 *
 * 这套测试为 UI migration loop 设计：
 *   - 验证页面不崩
 *   - 验证关键元素可见
 *   - 验证数据从 mock → UI 流通
 *   - 不深度测试业务逻辑（那是 unit test 的事）
 */
export default defineConfig({
  testDir: './tests/e2e',
  // 60s test budget — dynamic routes like /teams/[slug] take ~35s on first cold
  // compile in dev mode. Default 30s caused flakes on the first hit only.
  timeout: 60_000,
  expect: { timeout: 5_000 },

  // 顺序跑，避免 dev server race condition
  fullyParallel: false,
  workers: 1,

  // CI 上失败重试 1 次（处理 flaky network mocks）
  retries: process.env.CI ? 1 : 0,

  reporter: process.env.CI ? 'line' : 'list',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // 捕获 console errors → 测试自动 fail
    // 见 _helpers/page-errors.ts
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 默认不跑 mobile / safari，加速 loop。需要时取消注释：
    // {
    //   name: 'mobile',
    //   use: { ...devices['iPhone 14'] },
    // },
  ],

  // 自动启动 Next.js dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
