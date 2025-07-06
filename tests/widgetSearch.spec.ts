import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking.js'


test.describe('Widget search filter', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForSelector('#widget-selector-panel')
  })

  test('typing filters widget options', async ({ page }) => {
    const options = page.locator('#widget-selector-panel .widget-option')
    await expect(options).toHaveCount(5)

    await page.fill('#widget-search', 'terminal')

    const visible = page.locator('#widget-selector-panel .widget-option:not(.new-service):visible')
    await expect(visible).toHaveCount(1)
    await expect(visible.first()).toContainText('ASD-terminal')
    await expect(page.locator('#widget-selector-panel .widget-option.new-service')).toBeVisible()
  })
})
