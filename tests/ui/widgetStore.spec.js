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
  await page.route('**/services.json', route => route.fulfill({ json: ciServices }))
  await page.route('**/config.json', route => route.fulfill({ json: { ...ciConfig, boards } }))
  await page.route('**/asd/toolbox', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ name: 'ASD-toolbox' }) }))
  await page.route('**/asd/terminal', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ name: 'ASD-terminal' }) }))
  await page.route('**/asd/tunnel', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ name: 'ASD-tunnel' }) }))
  await page.route('**/asd/containers', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ name: 'ASD-containers' }) }))
}

const defaultBoards = () => [{
  ...clone(ciBoards[0]),
  views: [clone(ciBoards[0].views[0]), clone(ciBoards[1].views[0])]
}]

test.describe('WidgetStore UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await routeBase(page, defaultBoards())
    await page.goto('/')
    await page.locator('.widget-wrapper').first().waitFor()
  })

  test('Caching Widgets on View Switching', async ({ page }) => {
    const viewSelector = page.locator('#view-selector')
    const view1Widget = page.locator('.widget-wrapper').first()

    const initialSize = await page.evaluate(() => window.asd.widgetStore.widgets.size)
    expect(initialSize).toBe(1)
    await expect(view1Widget).toBeVisible()

    await viewSelector.selectOption({ label: 'Modified View 2' })
    await expect(view1Widget).toHaveCSS('display', 'none')

    const afterSwitchSize = await page.evaluate(() => window.asd.widgetStore.widgets.size)
    expect(afterSwitchSize).toBe(2)

    await viewSelector.selectOption({ label: 'Modified View 1' })
    await expect(view1Widget).not.toHaveCSS('display', 'none')

    const finalSize = await page.evaluate(() => window.asd.widgetStore.widgets.size)
    expect(finalSize).toBe(2)
  })

  test('LRU Eviction Policy', async ({ page }) => {
    const lruBoards = [{
      id: 'board-lru',
      name: 'LRU Board',
      order: 0,
      views: [{
        id: 'view-lru',
        name: 'LRU View',
        widgetState: [
          { order: '0', url: 'http://localhost:8000/asd/toolbox', columns: '1', rows: '1', type: 'web', dataid: 'W1', metadata: { title: 'w1' } },
          { order: '1', url: 'http://localhost:8000/asd/toolbox', columns: '1', rows: '1', type: 'web', dataid: 'W2', metadata: { title: 'w2' } },
          { order: '2', url: 'http://localhost:8000/asd/toolbox', columns: '1', rows: '1', type: 'web', dataid: 'W3', metadata: { title: 'w3' } }
        ]
      }]
    }]

    await page.unroute('**/config.json')
    await page.route('**/config.json', route => route.fulfill({ json: { ...ciConfig, boards: lruBoards } }))
    await page.addInitScript(() => {
      const apply = () => {
        if (window.asd && window.asd.widgetStore) {
          window.asd.widgetStore.maxSize = 2
        } else {
          setTimeout(apply, 0)
        }
      }
      apply()
    })
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('.widget-wrapper')).toHaveCount(2)

    const size = await page.evaluate(() => window.asd.widgetStore.widgets.size)
    expect(size).toBe(2)

    await expect(page.locator('[data-dataid="W1"]')).toHaveCount(0)
    await expect(page.locator('[data-dataid="W2"]')).toBeVisible()
    await expect(page.locator('[data-dataid="W3"]')).toBeVisible()
  })

  test('Manual Widget Removal', async ({ page }) => {
    const widget = page.locator('.widget-wrapper').first()
    const widgetId = await widget.getAttribute('data-dataid')
    const exists = await page.evaluate(id => window.asd.widgetStore.has(id), widgetId)
    expect(exists).toBe(true)

    await widget.locator('.widget-icon-remove').click()
    await expect(page.locator(`[data-dataid="${widgetId}"]`)).toHaveCount(0)

    const removed = await page.evaluate(id => window.asd.widgetStore.has(id), widgetId)
    expect(removed).toBe(false)
  })
})
