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
  
  /* Use a more conservative number of workers on CI to prevent resource contention. */
  workers: process.env.CI ? '50%' : undefined,
  /* Opt out of parallel tests on CI. */
  // workers: os.cpus().length -1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['json', { outputFile: 'playwright-report.json' }]
  ],

  timeout: 8000, 
  expect: {
    timeout: 1000, // Give assertions a little more breathing room.
  },

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    actionTimeout: 2000,
    navigationTimeout: 2000,
    
    /* OPTIMIZATION: Use 'retain-on-failure' to avoid saving artifacts for passing tests, saving CI resources. */
    trace: 'retain-on-failure',
    video: {
        mode: 'retain-on-failure',
        size: { width: 1280, height: 720 }
    },
    
    baseURL: process.env.STAGING === '1' ? 'http://localhost:8000' : 'http://localhost:8000',
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
