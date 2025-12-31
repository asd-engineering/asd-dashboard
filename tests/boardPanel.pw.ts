import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { navigate, addServices, clickFlyoutAction } from './shared/common'
import { openCreateFromTopMenu, ensurePanelOpen } from './shared/panels'
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
    await row.hover()
    await expect(row.locator('.panel-item-actions-flyout')).toBeVisible()
    await expect(row.locator('[data-item-action="navigate"]')).toHaveCount(0)
    await expect(row.locator('[data-item-action="delete"]')).toHaveText('❌')
  })

  test('label hint and aria for switch', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    await ensurePanelOpen(page, 'board-panel')
    const first = panel.locator('.panel-item').first()
    await expect(first).toHaveAttribute('aria-label', /^Switch:/)
    await first.hover()
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
    await firstItem.focus() // Focus the first row

    const fly = panel.locator('.panel-item').first().locator('.panel-item-actions-flyout')
    await expect(fly).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(fly).toBeHidden()
  })
})
