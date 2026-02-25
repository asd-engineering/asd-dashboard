import { test, expect } from '../fixtures'
import { routeServicesConfig } from '../shared/mocking'
import { navigate, addServices } from '../shared/common'
import { ensurePanelOpen } from '../shared/panels'

test.describe('sticky popover outside', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await addServices(page, 1)
  })

  test('outside click closes and reopen works', async ({ page }) => {
    const panel = page.locator('[data-testid="service-panel"]')
    await ensurePanelOpen(page, 'service-panel')
    const row = panel.locator('.panel-item').first()

    // Hover and wait for popover
    await row.hover()
    const pop = page.locator('[data-sticky-popover]')
    await expect(pop).toBeVisible({ timeout: 2000 })

    // Pin the popover
    await pop.locator('.panel-item-pin').click()
    await expect(pop).toBeVisible()

    // Click outside should close pinned popover
    await page.locator('main').click({ force: true })
    await expect(pop).toHaveCount(0)

    // Re-open by hovering again
    await ensurePanelOpen(page, 'service-panel')
    await row.hover()
    await expect(page.locator('[data-sticky-popover]')).toBeVisible({ timeout: 2000 })
  })
})
