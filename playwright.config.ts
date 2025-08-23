import os from 'os';
import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: os.cpus().length -1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['json', { outputFile: 'playwright-report.json' }]
  ],
  // There is no reason to wait so long in a PWA with hardly any content
  // Faster feedback and less spend minutes in Githun Actions
  timeout: 5000, // Timeout for each test (in milliseconds) default is 30000
  expect: {
      timeout: 500, // Timeout for `expect` assertions
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    actionTimeout: 2000, // Default timeout for actions like clicks, waits, etc.
    navigationTimeout: 2000,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    baseURL: process.env.STAGING === '1' ? 'http://localhost:8000' : 'http://localhost:8000',
    video: {
        mode: 'on',
        size: { width: 1280, height: 720 } // Updated to HD resolution
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      grep: process.env.CI ? /.*/ : /.^/,
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      grep: process.env.CI ? /.*/ : /.^/,
    },
  ],
  /* Run local dev server before starting the tests */
  webServer: {
    command: 'npm run start', // Adjust this command if necessary
    url: 'http://127.0.0.1:8000', // Ensure this matches the server URL
    reuseExistingServer: !process.env.CI,
  },
});
