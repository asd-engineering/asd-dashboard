import { test, expect } from '../fixtures'
import { routeServicesConfig } from '../shared/mocking'
import { navigate, addServices } from '../shared/common'
import { ensurePanelOpen } from '../shared/panels'
import { enableUITestMode } from '../shared/uiHelpers'

test.describe('sticky popover pin', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await addServices(page, 1)
    await enableUITestMode(page, { showFlyouts: false })
  })

  test('pin keeps popover visible', async ({ page }) => {
    const panel = page.locator('[data-testid="service-panel"]')
    await ensurePanelOpen(page, 'service-panel')
    const row = panel.locator('.panel-item').first()
    await row.hover()
    const pop = page.locator('[data-sticky-popover]')
    await expect(pop).toBeVisible()
    await pop.locator('button').first().click()
    await page.mouse.move(0, 0)
    await expect(pop).toBeVisible()
  })
})
