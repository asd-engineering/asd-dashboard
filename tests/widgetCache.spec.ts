import { test, expect } from '@playwright/test'
import { routeServicesConfig } from './shared/mocking'
import { addServicesByName, handleDialog } from './shared/common'

const viewName = 'Temp View'

test.describe('Widget iframe cache', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test.skip('reuses cached iframes across view switches', async ({ page }) => {
    // create empty secondary view
    await handleDialog(page, 'prompt', viewName)
    await page.click('#view-dropdown .dropbtn')
    await page.click('#view-control a[data-action="create"]')
    await expect(page.locator('.widget-wrapper')).toHaveCount(0)

    // return to default view and add widgets
    await page.selectOption('#view-selector', { label: 'Default View' })
    await addServicesByName(page, 'ASD-terminal', 12)
    await expect(page.locator('.widget-wrapper')).toHaveCount(12)
    const debugBefore = await page.evaluate(() => window.widgetCacheDebug && window.widgetCacheDebug.debugInfo())
    console.log('before switch', debugBefore)

    // switch away and back
    await page.selectOption('#view-selector', { label: viewName })
    await expect(page.locator('.widget-wrapper')).toHaveCount(0)
    await page.selectOption('#view-selector', { label: 'Default View' })
    const widgets = page.locator('.widget-wrapper')
    await expect(widgets).toHaveCount(12)
    const debugAfter = await page.evaluate(() => window.widgetCacheDebug && window.widgetCacheDebug.debugInfo())
    console.log('after switch', debugAfter)

    const hitCount = await page.evaluate(() => Array.from(document.querySelectorAll('.widget-wrapper')).filter(el => el.dataset.cache === 'hit').length)
    const missCount = await page.evaluate(() => Array.from(document.querySelectorAll('.widget-wrapper')).filter(el => el.dataset.cache === 'miss').length)
    expect(hitCount).toBe(10)
    expect(missCount).toBe(2)
  })
})
