import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { ensurePanelOpen } from './shared/panels'
import { navigate } from './shared/common'


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
    await navigate(page, '/')
    await page.waitForSelector('[data-testid="service-panel"]')
  })

  test('row and global counts update', async ({ page }) => {
    await ensurePanelOpen(page, 'service-panel') // Corrected this helper call
    const row = page.locator('[data-testid="service-panel"] .panel-item:has-text("ASD-toolbox")')

    // FIX: Perform the action FIRST
    await row.click()
    await page.locator('.widget-wrapper').first().waitFor() // Wait for the widget to be added

    // Now that the widget is added and state is saved, re-open the panel and check the count.
    await ensurePanelOpen(page, 'service-panel')
    await expect(page.locator('[data-testid="service-panel"] .panel-count')).toHaveText('Running: 1/1 Widgets: 1')

    // Re-acquire the locator to get the refreshed element
    const updatedRow = page.locator('[data-testid="service-panel"] .panel-item:has-text("ASD-toolbox")')
    await expect(updatedRow.locator('.panel-item-meta')).toHaveText('(1/20)')
  })
})
