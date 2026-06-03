import { test, expect } from '../fixtures'
import { routeServicesConfig } from '../shared/mocking'
import { navigate, addServices } from '../shared/common'
import { ensurePanelOpen } from '../shared/panels'

test.describe('sticky popover keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await addServices(page, 1)
  })

  test('arrow navigation and escape', async ({ page }) => {
    const panel = page.locator('[data-testid="service-panel"]')
    await ensurePanelOpen(page, 'service-panel')
    const row = panel.locator('.panel-item').first()

    // Hover and wait for popover
    await row.hover()
    const pop = page.locator('[data-sticky-popover]')
    await expect(pop).toBeVisible({ timeout: 2000 })

    // First button should be focused automatically on open
    const buttons = pop.locator('button')
    await expect(buttons.first()).toBeFocused()

    // ArrowRight moves to next button
    await page.keyboard.press('ArrowRight')
    await expect(buttons.nth(1)).toBeFocused()

    // ArrowLeft moves back
    await page.keyboard.press('ArrowLeft')
    await expect(buttons.first()).toBeFocused()

    // Tab cycles forward (focus trap)
    await page.keyboard.press('Tab')
    await expect(buttons.nth(1)).toBeFocused()

    // Shift+Tab cycles backward
    await page.keyboard.press('Shift+Tab')
    await expect(buttons.first()).toBeFocused()

    // Escape closes the popover and returns focus to anchor
    await page.keyboard.press('Escape')
    await expect(pop).toHaveCount(0)
    await expect(row).toBeFocused()
  })
})
