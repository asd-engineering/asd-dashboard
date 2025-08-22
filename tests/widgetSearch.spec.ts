import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking.js'
import { ensurePanelOpen } from './shared/panels'


test.describe('Widget search filter', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForSelector('[data-testid="service-panel"]')
  })

  test('typing filters widget options', async ({ page }) => {
    const panel = page.locator('[data-testid="service-panel"]')
    await ensurePanelOpen(page, 'service-panel')
    const options = panel.locator('.panel-item')
    await expect(options).toHaveCount(5)

    await panel.locator('.panel-search').fill('terminal')
    await expect(panel.locator('.panel-item', { hasText: 'ASD-terminal' })).toBeVisible()
    await expect(panel.locator('.panel-item', { hasText: 'ASD-toolbox' })).toBeHidden()
  })

  test('search normalization handles case/diacritics/whitespace', async ({ page }) => {
    const panel = page.locator('[data-testid="service-panel"]')
    await ensurePanelOpen(page, 'service-panel')
    const input = panel.locator('.panel-search')
    await input.fill('  TÉRMINAL  ')
    await expect(panel.locator('.panel-item', { hasText: 'ASD-terminal' })).toBeVisible()
    await expect(panel.locator('.panel-item', { hasText: 'ASD-toolbox' })).toBeHidden()
  })
})
