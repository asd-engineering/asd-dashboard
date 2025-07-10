// @ts-check
import { type Page } from '@playwright/test'

/**
 * Persist dashboard configuration in localStorage using StorageManager.
 * @function setLocalConfig
 * @param {Page} page - Playwright page instance
 * @param {object} config - Config object
 * @returns {Promise<void>}
 */
export async function setLocalConfig (page: Page, config: object): Promise<void> {
  await page.evaluate(async cfg => {
    const { default: sm } = await import('/storage/StorageManager.js')
    sm.setConfig(cfg as any)
  }, config)
}

/**
 * Persist services array in localStorage using StorageManager.
 * @function setLocalServices
 * @param {Page} page
 * @param {object[]} services
 * @returns {Promise<void>}
 */
export async function setLocalServices (page: Page, services: object[]): Promise<void> {
  await page.evaluate(async svc => {
    const { default: sm } = await import('/storage/StorageManager.js')
    sm.setServices(svc as any)
  }, services)
}

/**
 * Clears all StorageManager-managed state in the app under test.
 * Falls back to `localStorage.clear()` if StorageManager hasn't booted yet.
 *
 * This function is safe to call even before navigation, during `page.addInitScript`,
 * or when running tests that rely on fragment-based URLs (e.g. `/#local:import=...`).
 *
 * We observed test flakiness caused by calling this function on a blank page
 * (`about:blank`), which triggers a `SecurityError` when accessing `localStorage`
 * in browser contexts that haven't loaded an origin. This broke:
 *
 *   - viewStateIsolation.spec.ts (hydration race condition)
 *   - fragment.spec.ts (bootloader never advances, stays on about:blank)
 *
 * We also observed `TypeError: Failed to resolve module specifier` when the app's
 * bootloader hadn't yet loaded `StorageManager.js`, so we wrap that in a try/catch
 * and fallback to raw `localStorage.clear()` when needed.
 *
 * @param {import('@playwright/test').Page} page - The Playwright page to reset.
 */
export async function clearLocalState(page) {
  // Ensure we're not stuck on about:blank (localStorage is inaccessible)
  if ((await page.evaluate(() => document.URL)) === 'about:blank') {
    await page.goto('/'); // only fallback if nothing has loaded yet
  }

  await page.evaluate(async () => {
    try {
      const { default: sm } = await import('/storage/StorageManager.js');
      await sm.clearAll();
    } catch {
      localStorage.clear();
    }
  });
}

/**
 * Retrieve the current widgetStore size.
 * @function getWidgetStoreSize
 * @param {Page} page
 * @returns {Promise<number>}
 */
export async function getWidgetStoreSize (page: Page): Promise<number> {
  return await page.evaluate(() => window.asd?.widgetStore?.widgets.size ?? 0)
}

/**
 * Wait until the widgetStore finishes pending work.
 * @function waitForWidgetStoreIdle
 * @param {Page} page
 * @returns {Promise<void>}
 */
export async function waitForWidgetStoreIdle (page: Page): Promise<void> {
  await page.evaluate(async () => {
    if (window.asd?.widgetStore?.idle) {
      await window.asd.widgetStore.idle()
    }
  })
}

/**
 * Persist an arbitrary localStorage key via StorageManager misc API.
 * @function setLocalItem
 * @param {Page} page
 * @param {string} key
 * @param {string} value
 * @returns {Promise<void>}
 */
export async function setLocalItem (page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(async ({ key, value }) => {
    const { default: sm } = await import('/storage/StorageManager.js')
    sm.misc.setItem(key, value)
  }, { key, value })
}

/**
 * Persist the provided board and view identifiers as last-used values.
 * @function setLastUsedIds
 * @param {Page} page
 * @param {string} boardId
 * @param {string} viewId
 * @returns {Promise<void>}
 */
export async function setLastUsedIds (page: Page, boardId: string, viewId: string): Promise<void> {
  await setLocalItem(page, 'lastUsedBoardId', boardId)
  await setLocalItem(page, 'lastUsedViewId', viewId)
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
export async function injectSnapshot (
  page: Page,
  cfg: object,
  svc: object[],
  name: string
): Promise<void> {
  await page.evaluate(async ({ cfg, svc, name }) => {
    const { default: sm } = await import('/storage/StorageManager.js')
    const { gzipJsonToBase64url } = await import('/utils/compression.js')
    const encodedCfg = await gzipJsonToBase64url(cfg)
    const encodedSvc = await gzipJsonToBase64url(svc)
    await sm.saveStateSnapshot({ name, type: 'imported', cfg: encodedCfg, svc: encodedSvc })
  }, { cfg, svc, name })
}
