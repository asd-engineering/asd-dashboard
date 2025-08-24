import { test, expect } from '../fixtures'
import { routeServicesConfig } from '../shared/mocking'
import { navigate, addServices } from '../shared/common'
import { ensurePanelOpen } from '../shared/panels'
import { enableUITestMode } from '../shared/uiHelpers'

test.describe('sticky popover outside', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await addServices(page, 1)
    await enableUITestMode(page, { showFlyouts: false })
  })

  test('outside click closes and reopen works', async ({ page }) => {
    const panel = page.locator('[data-testid="service-panel"]')
    await ensurePanelOpen(page, 'service-panel')
    const row = panel.locator('.panel-item').first()
    await row.hover()
    const pop = page.locator('[data-sticky-popover]')
    await pop.locator('button').first().click() // pin
    await expect(pop).toBeVisible()
    await page.click('body')
    await expect(pop).toHaveCount(0)
    await row.hover()
    await expect(page.locator('[data-sticky-popover]')).toBeVisible()
  })
})
