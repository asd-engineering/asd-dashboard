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
 * Clear all stored dashboard state via StorageManager.
 * @function clearLocalState
 * @param {Page} page
 * @returns {Promise<void>}
 */
export async function clearLocalState (page: Page): Promise<void> {
  await page.evaluate(async () => {
    const { default: sm } = await import('/storage/StorageManager.js')
    sm.clearAll()
  })
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
 * @param {Page} page
 * @param {string} key
 * @param {string} value
 */
export async function setLocalItem (page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(async ({ key, value }) => {
    const { default: sm } = await import('/storage/StorageManager.js')
    sm.misc.setItem(key, value)
  }, { key, value })
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

/**
 * Persist the last used board and view identifiers.
 * @function setLastUsedIds
 * @param {Page} page
 * @param {string} boardId
 * @param {string} viewId
 * @returns {Promise<void>}
 */
export async function setLastUsedIds (
  page: Page,
  boardId: string,
  viewId: string
): Promise<void> {
  await page.evaluate(async ({ boardId, viewId }) => {
    const { default: sm } = await import('/storage/StorageManager.js')
    sm.misc.setLastBoardId(boardId)
    sm.misc.setLastViewId(viewId)
  }, { boardId, viewId })
}
