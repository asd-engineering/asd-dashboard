import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { navigate, addServices, clickFlyoutAction } from './shared/common'
import { openCreateFromTopMenu, ensurePanelOpen, hoverPanelItem } from './shared/panels'
import { enableUITestMode } from './shared/uiHelpers';

test.describe('View panel', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await addServices(page, 1)
    await enableUITestMode(page);
  })

  test('renders header label and hides count', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    await expect(panel.locator('.panel-arrow')).toHaveText('▼')
    await expect(panel.locator('.panel-label')).toHaveText(/View:\s+/)
    await expect(panel.locator('.panel-count')).toHaveCount(0)
  })

  test('shows widget counts and flyout on hover', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    await ensurePanelOpen(page, 'view-panel')
    const first = panel.locator('.panel-item').first()
    await expect(first.locator('.panel-item-meta')).toContainText('widgets')
    await hoverPanelItem(page, first)
    await expect(first.locator('.panel-item-actions-flyout')).toBeVisible()
    await expect(first.locator('[data-item-action="delete"]')).toHaveText('❌')
  })

  test('label hint and aria for switch', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    await ensurePanelOpen(page, 'view-panel')
    const first = panel.locator('.panel-item').first()
    await expect(first).toHaveAttribute('aria-label', /^Switch:/)
    await hoverPanelItem(page, first)
    await expect(first.locator('.panel-item-hint')).toHaveText('Click to switch')
  })

  test('top-menu create view', async ({ page }) => {
    const name = 'Playwright View'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(name) })
    await openCreateFromTopMenu(page, 'view-panel', 'New View')
    await ensurePanelOpen(page, 'view-panel')
    await expect(page.locator('[data-testid="view-panel"] .panel-item', { hasText: name })).toBeVisible()
  })

  test('per-item rename and delete', async ({ page }) => {
    const initial = 'Temp View'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(initial) })
    await openCreateFromTopMenu(page, 'view-panel', 'New View')

    // rename
    const renamed = 'Renamed View'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(renamed) })
    await clickFlyoutAction(page, 'view-panel', initial, 'rename')
    await expect(page.locator('[data-testid="view-panel"] .panel-item', { hasText: renamed })).toBeVisible()

    // delete
    page.once('dialog', async d => { expect(d.type()).toBe('confirm'); await d.accept() })
    await clickFlyoutAction(page, 'view-panel', renamed, 'delete')
    await expect(page.locator('[data-testid="view-panel"] .panel-item', { hasText: renamed })).toHaveCount(0)
  })

  test('keyboard focus reveals flyout', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
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
