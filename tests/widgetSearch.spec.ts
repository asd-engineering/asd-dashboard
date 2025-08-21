import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking.js'


test.describe('Widget search filter', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForSelector('[data-testid="service-panel"]')
  })

  test('typing filters widget options', async ({ page }) => {
    const options = page.locator('[data-testid="service-panel"] .panel-item')
    await expect(options).toHaveCount(5)

    await page.fill('[data-testid="service-panel"] .panel-search', 'terminal')

    const visible = page.locator('[data-testid="service-panel"] .panel-item:not([data-testid="panel-actions-trigger"]):visible')
    await expect(visible).toHaveCount(1)
    await expect(visible.first()).toContainText('ASD-terminal')
    await expect(page.locator('[data-testid="service-panel"] [data-testid="panel-actions-trigger"]').first()).toBeVisible()
  })
})
