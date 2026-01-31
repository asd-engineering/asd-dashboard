import { test, expect } from '../fixtures'
import { routeServicesConfig } from '../shared/mocking'
import { navigate, addServices } from '../shared/common'
import { ensurePanelOpen } from '../shared/panels'

test.describe('sticky popover pin', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await addServices(page, 1)
  })

  test('pin keeps popover visible', async ({ page }) => {
    const panel = page.locator('[data-testid="service-panel"]')
    await ensurePanelOpen(page, 'service-panel')
    const row = panel.locator('.panel-item').first()

    // Hover to trigger popover open
    await row.hover()
    await page.waitForTimeout(200)

    const pop = page.locator('[data-sticky-popover]')
    await expect(pop).toBeVisible({ timeout: 3000 })

    // Click the pin button to pin
    const pinBtn = pop.locator('.panel-item-pin')
    await pinBtn.click()
    await page.waitForTimeout(100)

    // Verify pinned state
    expect(await row.getAttribute('data-sticky-popover-pinned')).toBe('true')

    // Move mouse away completely
    await page.mouse.move(0, 0)
    await page.waitForTimeout(300)

    // Popover should still be visible because it's pinned
    await expect(pop).toBeVisible()
  })
})
