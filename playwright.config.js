import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/playwright-artifacts',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-reports/playwright-html', open: 'never' }],
    ['junit', { outputFile: 'test-reports/playwright-junit.xml' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'public-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174' },
      testMatch: /public\.spec\.js/,
    },
    {
      name: 'admin-chromium',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4173' },
      testMatch: /admin\.spec\.js/,
    },
  ],
  webServer: [
    {
      command: 'npm --prefix public-portal run preview -- --host 127.0.0.1 --port 4174',
      port: 4174,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm --prefix admin-panel run preview -- --host 127.0.0.1 --port 4173',
      port: 4173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
