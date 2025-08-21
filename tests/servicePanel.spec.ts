import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { addServices } from './shared/common'

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

  test('icons toggle visibility and magnifier conditional', async ({ page }) => {
    await addServices(page, 1)
    const panel = page.locator('[data-testid="service-panel"]')
    await panel.hover()
    const first = panel.locator('.panel-item').nth(1)
    const second = panel.locator('.panel-item').nth(2)
    const firstActs = first.locator('.panel-item-actions')
    await expect(firstActs).toHaveCSS('opacity', '0')
    await first.hover()
    await expect(firstActs).toHaveCSS('opacity', '1')
    await second.hover()
    await expect(firstActs).toHaveCSS('opacity', '0')
    await expect(first.locator('[data-item-action="navigate"]')).toHaveCount(1)
    await expect(second.locator('[data-item-action="navigate"]')).toHaveCount(0)
  })
})
