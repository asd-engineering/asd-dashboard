import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { navigate, addServices } from './shared/common'

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
    await expect(panel.locator('.panel-label')).not.toContainText('▼')
    await expect(panel.locator('.panel-count')).toHaveCount(0)
  })

  test('shows widget counts and icon visibility on hover/focus', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    await panel.hover()
    const first = panel.locator('.panel-item').nth(1)
    await expect(first.locator('.panel-item-meta')).toContainText('widgets')
    const acts = first.locator('.panel-item-actions')
    await expect(acts).toHaveCSS('opacity', '0')
    await first.hover()
    await expect(acts).toHaveCSS('opacity', '1')
    await panel.locator('.panel-search').hover()
    await expect(acts).toHaveCSS('opacity', '0')
    await first.focus()
    await expect(acts).toHaveCSS('opacity', '1')
  })

  test('opens dropdown and side Actions ▸', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    await panel.hover()
    await expect(panel.locator('.dropdown-content')).toBeVisible()
    const trigger = panel.locator('[data-testid="panel-actions-trigger"]')
    await trigger.hover()
    await expect(panel.locator('.dropdown-content.side-open .side-content')).toBeVisible()
    await expect(panel.locator('.side-content .panel-action', { hasText: 'New View' })).toBeVisible()
    await expect(panel.locator('.side-content .panel-action', { hasText: 'Reset View' })).toBeVisible()
  })

  test('header quick-add creates a view', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    const name = 'Quick View'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(name) })
    await panel.locator('.panel-quick-add').click()
    await panel.hover()
    await expect(panel.locator('.panel-item', { hasText: name })).toBeVisible()
  })

  test('per-item rename/delete and Reset View', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    await panel.hover()

    const v1 = 'Playwright View'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(v1) })
    const trigger = panel.locator('[data-testid="panel-actions-trigger"]')
    await trigger.hover()
    await panel.locator('.side-content .panel-action', { hasText: 'New View' }).click()
    await panel.hover()
    await expect(panel.locator('.panel-item', { hasText: v1 })).toBeVisible()

    const row = panel.locator('.panel-item', { hasText: v1 })
    await row.hover()
    const renameBtn = row.locator('[data-item-action="rename"]').first()
    await expect(renameBtn).toHaveText('✏️')
    const v2 = 'Renamed View'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(v2) })
    await renameBtn.click()
    const row2 = panel.locator('.panel-item', { hasText: v2 })
    await expect(row2).toBeVisible()

    await trigger.hover()
    page.once('dialog', async d => { expect(d.type()).toBe('confirm'); await d.accept() })
    await panel.locator('.side-content .panel-action', { hasText: 'Reset View' }).click()
    await panel.hover()

    await row2.hover()
      const deleteBtn = row2.locator('[data-item-action="delete"]').first()
      await expect(deleteBtn).toHaveText('❌')
      page.once('dialog', async d => { expect(d.type()).toBe('confirm'); await d.accept() })
      await deleteBtn.click()
      await panel.hover()
      await expect(panel.locator('.panel-item', { hasText: v2 })).toHaveCount(0)
    })

  test('keyboard interactions', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    await panel.focus()
    await page.keyboard.press('Enter')
    await expect(panel.locator('.dropdown-content')).toBeVisible()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('ArrowRight')
    await expect(panel.locator('.dropdown-content.side-open .side-content')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(panel.locator('.dropdown-content.side-open .side-content')).toHaveCount(0)
    await panel.focus()
    await page.keyboard.press('Escape')
    await expect(panel.locator('.dropdown-content')).toBeHidden()
  })

  test('row shows hint and aria uses Switch', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    await panel.hover()
    const row = panel.locator('.panel-item').nth(1)
    await expect(row).toHaveAttribute('aria-label', /^Switch:/)
    await row.hover()
    await expect(row.locator('.panel-item-hint')).toHaveText('Click to switch')
  })

  test('search filters view list', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    await panel.hover()

    const names = ['Alpha View', 'Beta View']
    for (const name of names) {
      page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(name) })
      const trigger = panel.locator('[data-testid="panel-actions-trigger"]')
      await trigger.hover()
      await panel.locator('.side-content .panel-action', { hasText: 'New View' }).click()
      await panel.hover()
    }
    await expect(panel.locator('.panel-item', { hasText: names[0] })).toBeVisible()
    await expect(panel.locator('.panel-item', { hasText: names[1] })).toBeVisible()

    await panel.locator('.panel-search').fill('alpha')
    await expect(panel.locator('.panel-item', { hasText: names[0] })).toBeVisible()
    await expect(panel.locator('.panel-item', { hasText: names[1] })).toHaveAttribute('hidden', '')
    await expect(panel.locator('[data-testid="panel-actions-trigger"]')).toBeVisible()
  })
})

