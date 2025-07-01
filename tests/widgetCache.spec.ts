import { test, expect } from '@playwright/test'
import { routeServicesConfig } from './shared/mocking'
import { addServicesByName, handleDialog } from './shared/common'

async function createEmptyView(page) {
  await handleDialog(page, 'prompt', 'CacheTest')
  await page.click('#view-dropdown .dropbtn')
  await page.click('#view-control a[data-action="create"]')
}

test.describe('Widget LRU Cache', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
  })

  test('evicts oldest widgets and reuses cached ones', async ({ page }) => {
    await addServicesByName(page, 'ASD-terminal', 12)
    const idsBefore = await page.$$eval('.widget-wrapper', els => els.map(el => el.dataset.dataid))

    await createEmptyView(page)
    await page.selectOption('#view-selector', { label: 'CacheTest' })

    const stats = await page.evaluate(() => window.widgetCacheDebug.getStats())
    expect(stats.size).toBe(10)

    await page.selectOption('#view-selector', { label: 'Default View' })

    const cacheStatuses = await page.$$eval('.widget-wrapper', els => els.map(el => ({ id: el.dataset.dataid, cache: el.dataset.cache })))
    const lastTen = idsBefore.slice(-10)
    for (const info of cacheStatuses) {
      if (lastTen.includes(info.id)) {
        expect(info.cache).toBe('hit')
      }
    }
    const missing = idsBefore.filter(id => !stats.keys.includes(id));
    expect(missing.length).toBeGreaterThanOrEqual(1);
    expect(missing.length).toBeLessThanOrEqual(2);
  })

  test('widgets persist across reloads and clear correctly', async ({ page }) => {
    await addServicesByName(page, 'ASD-terminal', 2)
    await page.reload()
    await expect(page.locator('.widget-wrapper')).toHaveCount(2)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('.widget-wrapper')).toHaveCount(0)
  })

  test('session id persists across board switches', async ({ page }) => {
    await addServicesByName(page, 'ASD-terminal', 2)
    const idBefore = await page.evaluate(() => window.sessionId)

    await handleDialog(page, 'confirm', '') // Accept Add Board confirmation
    await page.click('#board-control a[data-action="create"]')
    await page.waitForSelector('#board-selector option:nth-child(2)', { state:'attached' })

    await page.selectOption('#board-selector', { label: 'Default Board' })
    await page.waitForFunction(() => location.hash.includes('board='))

    const idAfter = await page.evaluate(() => window.sessionId)
    expect(idAfter).toBe(idBefore)
    await expect(page.locator('.widget-wrapper')).toHaveCount(2)
  })
})
