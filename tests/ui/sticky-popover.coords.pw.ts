import { test, expect } from '../fixtures'
import { routeServicesConfig } from '../shared/mocking'
import { navigate, addServices } from '../shared/common'
import { ensurePanelOpen } from '../shared/panels'

test.describe('sticky popover coords', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await addServices(page, 1)
  })

  test('pinned popover stays at fixed coords', async ({ page }) => {
    const panel = page.locator('[data-testid="service-panel"]')
    await ensurePanelOpen(page, 'service-panel')
    const row = panel.locator('.panel-item').first()

    // Hover and wait for popover
    await row.hover()
    const pop = page.locator('[data-sticky-popover]')
    await expect(pop).toBeVisible({ timeout: 2000 })

    // Pin the popover
    await pop.locator('.panel-item-pin').click()

    // Record position before layout shift
    const before = await pop.boundingBox()

    // Force a layout shift by adding an element before the row
    await page.evaluate(() => {
      const row = document.querySelector('[data-testid="service-panel"] .panel-item')
      const spacer = document.createElement('div')
      spacer.style.height = '40px'
      row?.before(spacer)
    })

    // Wait for any repaints
    await page.waitForTimeout(100)

    // Popover should still be at the same position (fixed positioning)
    const after = await pop.boundingBox()
    expect(before).toBeTruthy()
    expect(after).toBeTruthy()
    expect(Math.abs(before!.x - after!.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(before!.y - after!.y)).toBeLessThanOrEqual(1)
  })
})
