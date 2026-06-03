import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { navigate, addServices, clickFlyoutAction } from './shared/common'
import { openCreateFromTopMenu, ensurePanelOpen, hoverPanelItem } from './shared/panels'
import { enableUITestMode } from './shared/uiHelpers';

test.describe('Board panel', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await addServices(page, 1)
    await enableUITestMode(page);
  })

  test('renders header label and hides count', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    await expect(panel.locator('.panel-arrow')).toHaveText('▼')
    await expect(panel.locator('.panel-label')).toHaveText(/Board:\s+/)
    await expect(panel.locator('.panel-count')).toHaveCount(0)
  })

  test('flyout actions on hover', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    await ensurePanelOpen(page, 'board-panel')
    const row = panel.locator('.panel-item').first()
    await hoverPanelItem(page, row)
    // Flyout is now inside sticky popover (layer root)
    const popover = page.locator('[data-sticky-popover]')
    await expect(popover.locator('.panel-item-actions-flyout')).toBeVisible()
    await expect(popover.locator('[data-item-action="navigate"]')).toHaveCount(0)
    await expect(popover.locator('[data-item-action="delete"]')).toHaveText('❌')
  })

  test('label hint and aria for switch', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    await ensurePanelOpen(page, 'board-panel')
    const first = panel.locator('.panel-item').first()
    await expect(first).toHaveAttribute('aria-label', /^Switch:/)
    await hoverPanelItem(page, first)
    await expect(first.locator('.panel-item-hint')).toHaveText('Click to switch')
  })

  test('top-menu create board', async ({ page }) => {
    const newName = 'Playwright Board'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(newName) })
    await openCreateFromTopMenu(page, 'board-panel', 'New Board')
    await ensurePanelOpen(page, 'board-panel')
    await expect(page.locator('[data-testid="board-panel"] .panel-item', { hasText: newName })).toBeVisible()
  })

  test('per-item rename and delete', async ({ page }) => {
    const initial = 'Temp Board'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(initial) })
    await openCreateFromTopMenu(page, 'board-panel', 'New Board')

    // rename
    const renamed = 'Renamed Board'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(renamed) })
    await clickFlyoutAction(page, 'board-panel', initial, 'rename')
    await expect(page.locator('[data-testid="board-panel"] .panel-item', { hasText: renamed })).toBeVisible()

    // delete
    page.once('dialog', async d => { expect(d.type()).toBe('confirm'); await d.accept() })
    await clickFlyoutAction(page, 'board-panel', renamed, 'delete')
    await expect(page.locator('[data-testid="board-panel"] .panel-item', { hasText: renamed })).toHaveCount(0)
  })

  test('focus reveals flyout', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    await panel.focus()
    await page.keyboard.press('Enter') // Open panel
    const firstItem = panel.locator('.panel-item').first()

    // Hover to trigger sticky popover
    await firstItem.hover()
    await page.waitForTimeout(200)

    const popover = page.locator('[data-sticky-popover]')
    await expect(popover).toBeVisible()

    // Move mouse away first to prevent re-triggering on close
    await page.mouse.move(0, 0)
    await page.waitForTimeout(100)

    // Escape closes the popover (focus must be inside popover)
    await popover.locator('button').first().focus()
    await page.keyboard.press('Escape')
    await expect(popover).toHaveCount(0)
  })
})
