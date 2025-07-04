import { test as base, expect, type Page } from '@playwright/test';

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    await page.addInitScript(() => { (window as any).__disableDebounce__ = true; });
    await use(page);
  },
});

export { expect };
export type { Page } from '@playwright/test';
