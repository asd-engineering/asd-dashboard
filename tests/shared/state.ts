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
}
