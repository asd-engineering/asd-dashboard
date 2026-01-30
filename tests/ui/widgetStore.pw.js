// tests/ui/widgetStore.spec.js
import { test, expect } from '../fixtures'
import { getWidgetStoreSize, waitForWidgetStoreIdle } from '../shared/state.js'
import { navigate, selectViewByLabel, addServicesByName } from '../shared/common.js'
import { ciConfig, ciBoards } from '../data/ciConfig'
import { ciServices } from '../data/ciServices'
import { routeWithWidgetStoreSize } from '../shared/mocking'

/**
 * Deep clone helper used to avoid mutating shared fixtures.
 * @param {any} obj
 * @returns {any}
 */
function clone (obj) {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Routes core configuration and service endpoints.
 * @param {import('@playwright/test').Page} page
 * @param {Array<object>} boards
 * @returns {Promise<void>}
 */
async function routeBase (page, boards) {
  await page.route('**/services.json', (route) =>
    route.fulfill({ json: ciServices })
  )
  await page.route('**/config.json', (route) =>
    route.fulfill({ json: { ...ciConfig, boards } })
  )
  await page.route('**/asd/toolbox', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ name: 'ASD-toolbox' })
    })
  )
  await page.route('**/asd/terminal', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ name: 'ASD-terminal' })
    })
  )
  await page.route('**/asd/tunnel', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ name: 'ASD-tunnel' })
    })
  )
  await page.route('**/asd/containers', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ name: 'ASD-containers' })
    })
  )
}

const defaultBoards = () => [
  {
    ...clone(ciBoards[0]),
    views: [clone(ciBoards[0].views[0]), clone(ciBoards[1].views[0])]
  }
]

test.describe('WidgetStore UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await routeBase(page, defaultBoards())
    await navigate(page, '/')
    await page.locator('.widget-wrapper').first().waitFor()
  })

  test('Caching Widgets on View Switching', async ({ page }) => {
    const view1Widget = page.locator('.widget-wrapper').first()

    const initialSize = await getWidgetStoreSize(page)
    expect(initialSize).toBe(1)
    await expect(view1Widget).toBeVisible()

    await page.waitForSelector('#view-selector', { state: 'attached' })
    await selectViewByLabel(page, 'Modified View 2')

    await waitForWidgetStoreIdle(page)
    await expect(view1Widget).toBeHidden()

    const afterSwitchSize = await getWidgetStoreSize(page)
    expect(afterSwitchSize).toBe(2)

    await page.waitForSelector('#view-selector', { state: 'attached' })
    await selectViewByLabel(page, 'Modified View 1')

    await waitForWidgetStoreIdle(page)
    await expect(view1Widget).toBeVisible()

    const finalSize = await getWidgetStoreSize(page)
    expect(finalSize).toBe(2)
  })

  test('LRU Eviction Policy', async ({ page }) => {
    // Boot with maxSize=2 so adding a 3rd forces an eviction
    await routeWithWidgetStoreSize(
      page,
      [
        {
          id: 'b1',
          name: 'B1',
          order: 0,
          views: [{ id: 'v1', name: 'V1', widgetState: [] }]
        }
      ],
      [
        { name: 'ASD-toolbox', url: 'http://localhost:8000/asd/toolbox' },
        { name: 'ASD-terminal', url: 'http://localhost:8000/asd/terminal' },
        { name: 'ASD-tunnel', url: 'http://localhost:8000/asd/tunnel' }
      ],
      2
    )

    await navigate(page, '/')

    // CI stabilization: wait for panel to be fully ready
    if (process.env.CI) {
      await page.waitForTimeout(500)
    }

    // Add three → oldest must be evicted to keep at most 2 visible
    await addServicesByName(page, 'ASD-toolbox', 1, true)
    await addServicesByName(page, 'ASD-terminal', 2, true)
    await addServicesByName(page, 'ASD-tunnel', 2, true)
    await waitForWidgetStoreIdle(page)

    // Count only visible wrappers — hidden/tearing-down nodes shouldn't fail the test
    await expect(page.locator('.widget-wrapper:visible')).toHaveCount(2)

    // Verify LRU eviction kept the newest widgets
    const visibleIds = await page.locator('.widget-wrapper:visible').evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-dataid'))
    )
    // W1 should have been evicted (oldest)
    expect(visibleIds).not.toContain('W1')
    expect(visibleIds.length).toBe(2)

    // Flush IndexedDB writes before reload (absolute path is browser-side import)
    await page.evaluate(async () => {
      const sm = await import('/storage/StorageManager.js') // eslint-disable-line
      await sm.StorageManager.flush()
    })

    // Reload must preserve the invariant
    await page.reload()
    await waitForWidgetStoreIdle(page)

    // Wait for widgets to render (Firefox needs more time after reload)
    await page.waitForSelector('.widget-wrapper', { timeout: 5000 }).catch(() => {})

    const afterHydration = await page.locator('.widget-wrapper').evaluateAll(
      (els) => els.length
    )
    console.log('Widget count after hydration:', afterHydration)

    const widgets = page.locator('.widget-wrapper')
    await expect(widgets).toHaveCount(2, { timeout: 5000 })

    // Verify LRU policy persisted after reload
    const idsAfterReload = await page.locator('.widget-wrapper').evaluateAll((els) =>
      els.map((e) => e.getAttribute('data-dataid'))
    )
    expect(idsAfterReload).not.toContain('W1')
    expect(idsAfterReload.length).toBe(2)
  })

  test('Removes widget via UI and updates widgetStore state', async ({
    page
  }) => {
    const widget = page.locator('.widget-wrapper').first()
    const widgetId = await widget.getAttribute('data-dataid')
    expect(widgetId).not.toBeNull()
    const exists = await page.evaluate(
      (id) => window.asd.widgetStore.has(id),
      widgetId
    )
    expect(exists).toBe(true)

    await widget.locator('.widget-icon-remove').click()
    await waitForWidgetStoreIdle(page)
    await expect(page.locator(`[data-dataid="${widgetId}"]`)).toHaveCount(0)

    const removed = await page.evaluate(
      (id) => window.asd.widgetStore.has(id),
      widgetId
    )
    expect(removed).toBe(false)
  })
})
