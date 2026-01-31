import { test as base, expect, type Page } from '@playwright/test';

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await page.addInitScript(() => { (window as any).__disableDebounce__ = true; });

    // Stub widget iframe URLs to prevent 404 errors and reduce test noise
    // Matches any /asd/* path (toolbox, terminal, tunnel, containers, templated, etc.)
    await page.route(/\/asd\/[^/]+$/, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Widget Stub</title></head><body>Widget</body></html>'
      });
    });

    // Stub manifest.json to prevent 404 errors
    await page.route('**/manifest.json', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ name: 'ASD Dashboard', short_name: 'ASD' })
      });
    });

    // Stub config.json to prevent 404 errors (app checks for external config)
    await page.route('**/config.json', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });

    // Stub services.json to prevent "Invalid services data" errors
    // This is the fallback services file that fetchServices() tries to load
    await page.route('**/services.json', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await use(page);
  },
});

export { expect };
export type { Page } from '@playwright/test';
