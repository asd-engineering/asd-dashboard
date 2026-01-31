// import os from 'os';
import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Match .pw.ts files (renamed from .spec.ts to avoid bun test conflicts) */
  testMatch: '**/*.pw.{ts,js}',
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

  // Increase timeouts for CI which has slower runners
  timeout: process.env.CI ? 15000 : 8000,
  expect: {
    timeout: process.env.CI ? 2000 : 1000,
  },

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    actionTimeout: process.env.CI ? 5000 : 2000,
    navigationTimeout: process.env.CI ? 5000 : 2000,
    
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
      // grep: process.env.CI ? /.*/ : /.^/,
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // Firefox needs more time for IndexedDB operations and DecompressionStream
      timeout: 15000,
      // grep: process.env.CI ? /.*/ : /.^/,
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      // WebKit also needs more time for async operations
      timeout: 15000,
      // grep: process.env.CI ? /.*/ : /.^/,
    },
  ],
  /* Run local dev server before starting the tests */
  webServer: {
    command: 'npm run start', // Adjust this command if necessary
    url: 'http://127.0.0.1:8000', // Ensure this matches the server URL
    reuseExistingServer: !process.env.CI,
  },
});
