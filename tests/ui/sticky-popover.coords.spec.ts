import { test, expect } from '../fixtures'
import { routeServicesConfig } from '../shared/mocking'
import { navigate, addServices } from '../shared/common'
import { ensurePanelOpen } from '../shared/panels'
import { enableUITestMode } from '../shared/uiHelpers'

test.describe('sticky popover coords', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await addServices(page, 1)
    await enableUITestMode(page, { showFlyouts: false })
  })

  test('pinned popover stays at fixed coords', async ({ page }) => {
    const panel = page.locator('[data-testid="service-panel"]')
    await ensurePanelOpen(page, 'service-panel')
    const row = panel.locator('.panel-item').first()
    await row.hover()
    const pop = page.locator('[data-sticky-popover]')
    await pop.locator('button').first().click()
    const before = await pop.boundingBox()
    await page.evaluate(() => {
      const row = document.querySelector('[data-testid="service-panel"] .panel-item')
      const spacer = document.createElement('div')
      spacer.style.height = '40px'
      row?.before(spacer)
    })
    const after = await pop.boundingBox()
    expect(Math.abs(before.x - after.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(before.y - after.y)).toBeLessThanOrEqual(1)
  })
})
