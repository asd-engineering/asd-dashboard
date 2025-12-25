import { test as base, expect, type Page } from '@playwright/test';

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      (window as any).__disableDebounce__ = true;
      // Disable floating menu in tests to maintain DOM structure
      if (!(window as any).asd) (window as any).asd = {};
      (window as any).asd.testMode = true;
    });
    await use(page);
  },
});

export { expect };
export type { Page } from '@playwright/test';
