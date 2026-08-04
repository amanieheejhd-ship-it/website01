import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the ALREADY-RUNNING native stack (start it with `.\dev-up.ps1`). Playwright does NOT
 * boot the heavy stack itself. Serial (1 worker) for the OOM-prone machine + shared admin data;
 * trace + screenshot + video retained on failure.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 12_000 },
  reporter: [['list'], ['html', { outputFolder: 'e2e-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
