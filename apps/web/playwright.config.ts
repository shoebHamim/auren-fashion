import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);

/**
 * E2E (PLAN §23.1): real browser against the running web app + API + local infra.
 * Prerequisite: `pnpm infra:up && pnpm db:migrate`. Servers are reused when already running locally.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @auren/api dev',
      url: 'http://localhost:4000/api/health',
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @auren/web dev',
      url: 'http://localhost:3100',
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
  ],
});
