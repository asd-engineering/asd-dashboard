import { test, expect } from '@playwright/test'
import { ciConfig, ciBoards } from '../data/ciConfig'
import { ciServices } from '../data/ciServices'

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

/**
 * Routes config for LRU scenario and sets maxSize.
 * @param {import('@playwright/test').Page} page
 * @param {Array<object>} widgetState
 * @param {number} [maxSize=2]
 * @returns {Promise<void>}
 */
async function routeWithLRUConfig (page, widgetState, maxSize = 2) {
  const boards = [
    {
      id: 'board-lru',
      name: 'LRU Board',
      order: 0,
      views: [{ id: 'view-lru', name: 'LRU View', widgetState }]
    }
  ]

  await page.addInitScript((size) => {
    const apply = () => {
      if (window.asd?.widgetStore) {
        window.asd.widgetStore.maxSize = size
      } else {
        setTimeout(apply, 0)
      }
    }
    apply()
  }, maxSize)
  await page.unroute('**/config.json').catch(() => {})
  await routeBase(page, boards)
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
    await page.goto('/')
    await page.locator('.widget-wrapper').first().waitFor()
  })

  test('Caching Widgets on View Switching', async ({ page }) => {
    const viewSelector = page.locator('#view-selector')
    const view1Widget = page.locator('.widget-wrapper').first()

    const initialSize = await page.evaluate(
      () => window.asd.widgetStore.widgets.size
    )
    expect(initialSize).toBe(1)
    await expect(view1Widget).toBeVisible()

    await viewSelector
      .selectOption({ label: 'Modified View 2' })
      .catch(() => viewSelector.selectOption('view-12345678'))
    await expect(view1Widget).toHaveCSS('display', 'none')

    const afterSwitchSize = await page.evaluate(
      () => window.asd.widgetStore.widgets.size
    )
    expect(afterSwitchSize).toBe(2)

    await viewSelector
      .selectOption({ label: 'Modified View 1' })
      .catch(() => viewSelector.selectOption('view-1234567'))
    await expect(view1Widget).not.toHaveCSS('display', 'none')

    const finalSize = await page.evaluate(
      () => window.asd.widgetStore.widgets.size
    )
    expect(finalSize).toBe(2)
  })

  test('LRU Eviction Policy', async ({ page }) => {
    const widgetState = [
      {
        order: '0',
        url: 'http://localhost:8000/asd/toolbox',
        columns: '1',
        rows: '1',
        type: 'web',
        dataid: 'W1',
        metadata: { title: 'w1' }
      },
      {
        order: '1',
        url: 'http://localhost:8000/asd/toolbox',
        columns: '1',
        rows: '1',
        type: 'web',
        dataid: 'W2',
        metadata: { title: 'w2' }
      },
      {
        order: '2',
        url: 'http://localhost:8000/asd/toolbox',
        columns: '1',
        rows: '1',
        type: 'web',
        dataid: 'W3',
        metadata: { title: 'w3' }
      }
    ]

    const beforeHydration = await page.$$eval('.widget-wrapper', (els) => els.length)
    console.log('Widget count before hydration:', beforeHydration)

    await routeWithLRUConfig(page, widgetState, 2)
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    const afterHydration = await page.$$eval('.widget-wrapper', (els) => els.length)
    console.log('Widget count after hydration:', afterHydration)

    await page.waitForFunction(() =>
      document.querySelectorAll('.widget-wrapper').length === 2
    )

    const modal = page.locator('#eviction-modal')
    await expect(modal).toBeVisible()
    await modal.locator('button:has-text("Remove")').click()
    await expect(modal).toBeHidden()

    await page.reload()
    await page.waitForFunction(() =>
      document.querySelectorAll('.widget-wrapper').length === 2
    )

    const ids = await page.$$eval('.widget-wrapper', (els) =>
      els.map((e) => e.getAttribute('data-dataid'))
    )
    expect(ids).not.toContain('W1')
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
    await expect(page.locator(`[data-dataid="${widgetId}"]`)).toHaveCount(0)

    const removed = await page.evaluate(
      (id) => window.asd.widgetStore.has(id),
      widgetId
    )
    expect(removed).toBe(false)
  })
})
