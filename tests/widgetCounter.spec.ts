import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { ensurePanelOpen } from './shared/common'


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
    await page.waitForSelector('[data-testid="service-panel"]')
  })

  test('row and global counts update', async ({ page }) => {
    await ensurePanelOpen(page)
    await page.locator('[data-testid="service-panel"] .panel-item').nth(1).click()
    await page.locator('.widget-wrapper').first().waitFor()

    await expect(page.locator('[data-testid="service-panel"] .panel-count')).toHaveText('Running: 1/1 / Widgets: 1')

    await ensurePanelOpen(page)
    const row = page.locator('[data-testid="service-panel"] .panel-item:has-text("ASD-toolbox")')
    await expect(row.locator('.panel-item-meta')).toHaveText('(1/20)')
    await row.click()
    await expect(page.locator('.widget-wrapper')).toHaveCount(1)
  })
})
