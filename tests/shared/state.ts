// @ts-check
import { type Page } from "@playwright/test";

/**
 * Retrieve the current widgetStore size.
 * @function getWidgetStoreSize
 * @param {Page} page
 * @returns {Promise<number>}
 */
export async function getWidgetStoreSize(page: Page): Promise<number> {
  return await page.evaluate(() => window.asd?.widgetStore?.widgets.size ?? 0);
}

/**
 * Wait until the widgetStore finishes pending work.
 * @function waitForWidgetStoreIdle
 * @param {Page} page
 * @returns {Promise<void>}
 */
export async function waitForWidgetStoreIdle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (window.asd?.widgetStore?.idle) {
      await window.asd.widgetStore.idle();
    }
  });
}

/**
 * Persist an arbitrary localStorage key via StorageManager misc API.
 * @function setLocalItem
 * @param {Page} page
 * @param {string} key
 * @param {string} value
 * @returns {Promise<void>}
 */
export async function setLocalItem(
  page: Page,
  key: string,
  value: string,
): Promise<void> {
  await page.evaluate(
    async ({ key, value }) => {
      const { default: sm } = await import("/storage/StorageManager.js");
      sm.misc.setItem(key, value);
    },
    { key, value },
  );
}

/**
 * Inject a saved state snapshot using StorageManager.
 * @function injectSnapshot
 * @param {Page} page
 * @param {object} cfg
 * @param {object[]} svc
 * @param {string} name
 * @returns {Promise<void>}
 */
export async function injectSnapshot(
  page: Page,
  cfg: object,
  svc: object[],
  name: string,
): Promise<void> {
  await page.evaluate(
    async ({ cfg, svc, name }) => {
      const { default: sm } = await import("/storage/StorageManager.js");
      const { gzipJsonToBase64url } = await import("/utils/compression.js");
      const encodedCfg = await gzipJsonToBase64url(cfg);
      const encodedSvc = await gzipJsonToBase64url(svc);
      await sm.saveStateSnapshot({
        name,
        type: "imported",
        cfg: encodedCfg,
        svc: encodedSvc,
      });
    },
    { cfg, svc, name },
  );
  // We must reload or we witness an empty state table
  await page.reload()
}

/**
 * Load raw snapshot store via StorageManager.
 */
export async function loadStateStore(page: Page): Promise<{ version: number; states: any[] }> {
  return await page.evaluate(async () => {
    const { default: sm } = await import('/storage/StorageManager.js');
    return sm.loadStateStore();
  });
}

/**
 * Switch to a snapshot by exact name through the State tab UI.
 * (Keeps UI-path parity with real users; avoids LS mutations.)
 */
export async function switchSnapshotByName(page: Page, name: string): Promise<void> {
  await page.evaluate(() => import('/component/modal/configModal.js').then(m => m.openConfigModal()));
  await page.locator('.tabs button[data-tab="stateTab"]').click();
  await page.locator('#stateTab').waitFor();
  const row = page.locator(`#stateTab tbody tr:has-text("${name}")`).first();
  await row.locator('button[data-action="switch"]').click();

  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('body[data-ready="true"]');
}

/**
 * Merge a snapshot by name via UI (idempotent).
 */
export async function mergeSnapshotByName(page: Page, name: string): Promise<void> {
  await page.evaluate(() => import('/component/modal/configModal.js').then(m => m.openConfigModal()));
  await page.locator('.tabs button[data-tab="stateTab"]').click();
  await page.locator('#stateTab').waitFor();
  const row = page.locator(`#stateTab tbody tr:has-text("${name}")`).first();
  await row.locator('button[data-action="merge"]').click({ force: true });

  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('body[data-ready="true"]');
}
