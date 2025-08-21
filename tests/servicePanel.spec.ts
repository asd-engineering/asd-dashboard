import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'

// Basic structure tests for service selector panel

test.describe('Service panel', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForSelector('[data-testid="service-panel"]')
  })

  test('arrow, hidden label, visible count and DOM order', async ({ page }) => {
    const panel = page.locator('[data-testid="service-panel"]')
    await expect(panel.locator('.panel-arrow')).toHaveText('▼')
    await expect(panel.locator('.panel-label')).toHaveCount(1)
    await expect(panel.locator('.panel-label')).toBeHidden()
    await expect(panel.locator('.panel-count')).toBeVisible()

    const order = await panel.evaluate((el) => Array.from(el.children).map(c => c.className))
    expect(order.slice(0,4)).toEqual(['panel-arrow','panel-label','panel-search','panel-count'])
  })
})
