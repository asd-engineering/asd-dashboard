import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { navigate, addServices } from './shared/common'
import { openCreateFromTopMenu, ensurePanelOpen } from './shared/panels'

test.describe('View panel', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await addServices(page, 1)
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
    await first.hover()
    await expect(first.locator('.panel-item-actions-flyout')).toBeVisible({ timeout: 500 })
    await expect(first.locator('[data-item-action="delete"]')).toHaveText('❌')
  })

  test('label hint and aria for switch', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    await ensurePanelOpen(page, 'view-panel')
    const first = panel.locator('.panel-item').first()
    await expect(first).toHaveAttribute('aria-label', /^Switch:/)
    await first.hover()
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
    const panel = page.locator('[data-testid="view-panel"]')
    const initial = 'Temp View'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(initial) })
    await openCreateFromTopMenu(page, 'view-panel', 'New View')
    await ensurePanelOpen(page, 'view-panel')
    const row = panel.locator('.panel-item', { hasText: initial })
    await row.hover()
    const renameBtn = row.locator('[data-item-action="rename"]').first()
    await expect(renameBtn).toHaveText('✏️')
    const renamed = 'Renamed View'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(renamed) })
    await renameBtn.click()
    const rowRenamed = panel.locator('.panel-item', { hasText: renamed })
    await rowRenamed.hover()
    const deleteBtn = rowRenamed.locator('[data-item-action="delete"]').first()
    page.once('dialog', async d => { expect(d.type()).toBe('confirm'); await d.accept() })
    await deleteBtn.click()
    await expect(panel.locator('.panel-item', { hasText: renamed })).toHaveCount(0)
  })

  test('keyboard focus reveals flyout', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    await panel.focus()
    await page.keyboard.press('Enter') // Open panel
    const firstItem = panel.locator('.panel-item').first()
    await firstItem.focus() // Focus the first row
    const row = panel.locator('.panel-item').first()
    await row.hover()
    await expect(row.locator('.panel-item-actions-flyout')).toBeVisible({ timeout: 500 })
    await page.keyboard.press('Escape')
    await page.mouse.move(0, 0)
    await expect(row.locator('.panel-item-actions-flyout')).toBeHidden()
  })
})
