import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'


test.describe('Widget counters', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.addInitScript(() => {
      const apply = () => {
        if (window.asd?.widgetStore) {
          window.asd.widgetStore.maxSize = 1
        } else {
          setTimeout(apply, 0)
        }
      }
      apply()
    })
    await page.goto('/')
    await page.waitForSelector('#widget-selector-panel')
  })

  test('row and global counts update', async ({ page }) => {
    await page.click('#widget-dropdown-toggle')
    await page.click('#widget-selector-panel .widget-option:has-text("ASD-toolbox")')
    await page.locator('.widget-wrapper').first().waitFor()

    await expect(page.locator('#widget-count')).toHaveText('Active: 1 / Used: 1 / Max: 1')

    await page.click('#widget-dropdown-toggle')
    const row = page.locator('#widget-selector-panel .widget-option:has-text("ASD-toolbox")')
    await expect(row).toContainText('(1/20)')
    await row.click()
    await expect(page.locator('.widget-wrapper')).toHaveCount(1)
  })
})
