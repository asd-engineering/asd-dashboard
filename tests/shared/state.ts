// @ts-check
import { type Page } from "@playwright/test";
import { evaluateSafe, waitForAppReady, reloadReady } from "./common";
import { openConfigModalSafe } from './uiHelpers'

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
  await evaluateSafe(page, async () => {
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
      const { StorageManager: sm } = await import("/storage/StorageManager.js");
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
  opts?: { reload?: boolean }
): Promise<void> {
  await evaluateSafe(page,
    async ({ cfg, svc, name }) => {
      const { StorageManager: sm } = await import("/storage/StorageManager.js");
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
  if (opts?.reload !== false) {
    await reloadReady(page)
  };
}

/**
 * Load raw snapshot store via StorageManager.
 */
export async function loadStateStore(page: Page): Promise<{ version: number; states: any[] }> {
  return await page.evaluate(async () => {
    const { StorageManager: sm } = await import('/storage/StorageManager.js');
    return sm.loadStateStore();
  });
}

/**
 * Switch to a snapshot by exact name through the State tab UI.
 * (Keeps UI-path parity with real users; avoids LS mutations.)
 */
export async function switchSnapshotByName(page: Page, name: string): Promise<void> {
  await openConfigModalSafe(page, "stateTab")

  const row = page.locator(`#stateTab tbody tr:has-text("${name}")`).first();
  const switchBtn = row.locator('button[data-action="switch"]');

  // Click switch and wait for the reload it triggers
  await Promise.all([
    page.waitForEvent('load'),
    switchBtn.click()
  ]);

  await waitForAppReady(page)
}

/**
 * Merge a snapshot by name via UI (idempotent).
 */
export async function mergeSnapshotByName(page: Page, name: string): Promise<void> {
  await openConfigModalSafe(page, "stateTab")

  const row = page.locator(`#stateTab tbody tr:has-text("${name}")`).first();
  const mergeBtn = row.locator('button[data-action="merge"]');

  // Click merge and wait for the reload it triggers
  await Promise.all([
    page.waitForEvent('load'),
    mergeBtn.click({ force: true })
  ]);

  await waitForAppReady(page)
}


/**
 * If the LRU eviction modal appears, confirm it; otherwise no-op.
 * Keeps timeouts small and waits for widgetStore to settle.
 */
export async function evictIfModalPresent(
  page: Page,
  opts: { appearTimeoutMs?: number; hideTimeoutMs?: number } = {},
): Promise<void> {
  // Short timeout - if modal is going to appear, it appears quickly
  // Don't waste time waiting for modals that won't appear
  const defaultAppear = process.env.CI ? 800 : 500;
  const defaultHide = process.env.CI ? 2000 : 1000;
  const appearTimeoutMs = opts.appearTimeoutMs ?? defaultAppear;
  const hideTimeoutMs = opts.hideTimeoutMs ?? defaultHide;

  const modal = page.locator('#eviction-modal');

  // Quick check if modal is already visible (no wait)
  if (await modal.isVisible().catch(() => false)) {
    const autoRemoveBtn = modal.locator('#evict-lru-btn');
    await autoRemoveBtn.click({ force: true, timeout: 2000 }).catch(() => {});
    await modal.waitFor({ state: 'hidden', timeout: hideTimeoutMs }).catch(() => {});
    return;
  }

  // Brief wait for modal to appear - return early if it doesn't
  const appeared = await modal.waitFor({ state: 'visible', timeout: appearTimeoutMs })
    .then(() => true)
    .catch(() => false);

  if (appeared) {
    const autoRemoveBtn = modal.locator('#evict-lru-btn');
    await autoRemoveBtn.click({ force: true, timeout: 2000 }).catch(() => {});
    await modal.waitFor({ state: 'hidden', timeout: hideTimeoutMs }).catch(() => {});
  }

  // Wait for store to settle (handles auto-eviction case too)
  await waitForWidgetStoreIdle(page).catch(() => {});
}