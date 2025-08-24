import { test, expect } from '../fixtures'
import { routeServicesConfig } from '../shared/mocking'
import { navigate, addServices } from '../shared/common'
import { ensurePanelOpen } from '../shared/panels'
import { enableUITestMode } from '../shared/uiHelpers'

test.describe('sticky popover keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await addServices(page, 1)
    await enableUITestMode(page, { showFlyouts: false })
  })

  test('arrow navigation and escape', async ({ page }) => {
    const panel = page.locator('[data-testid="service-panel"]')
    await ensurePanelOpen(page, 'service-panel')
    const row = panel.locator('.panel-item').first()
    await row.hover()
    const pop = page.locator('[data-sticky-popover]')
    await pop.locator('button').first().focus()
    await page.keyboard.press('ArrowRight')
    await expect(pop.locator('button').nth(1)).toBeFocused()
    await page.keyboard.press('ArrowLeft')
    await expect(pop.locator('button').first()).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(pop.locator('button').nth(1)).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(pop.locator('button').first()).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(pop).toHaveCount(0)
    await expect(row).toBeFocused()
  })
})
