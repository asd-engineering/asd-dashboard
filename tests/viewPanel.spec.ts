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
    await expect(panel.locator('.panel-label')).toHaveText(/▼ View:\s+/)
    await expect(panel.locator('.panel-count')).toHaveCount(0)
  })

  test('opens dropdown and side Actions ▸', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    await panel.hover()
    await expect(panel.locator('.dropdown-content')).toBeVisible()
    await panel.locator('[data-testid="panel-actions-trigger"]').click()
    await expect(panel.locator('.dropdown-content.side-open .side-content')).toBeVisible()
    await expect(panel.locator('.side-content .panel-action', { hasText: 'New View' })).toBeVisible()
    await expect(panel.locator('.side-content .panel-action', { hasText: 'Reset View' })).toBeVisible()
  })

  test('per-item rename/delete and Reset View', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    await panel.hover()

    const v1 = 'Playwright View'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(v1) })
    await panel.locator('[data-testid="panel-actions-trigger"]').click()
    await panel.locator('.side-content .panel-action', { hasText: 'New View' }).click()
    await panel.hover()
    await expect(panel.locator('.panel-item', { hasText: v1 })).toBeVisible()

    const renameBtn = panel.locator('.panel-item', { hasText: v1 }).locator('[data-item-action="rename"]').first()
    const v2 = 'Renamed View'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(v2) })
    await renameBtn.click()
    await expect(panel.locator('.panel-item', { hasText: v2 })).toBeVisible()

    await panel.locator('[data-testid="panel-actions-trigger"]').click()
    page.once('dialog', async d => { expect(d.type()).toBe('confirm'); await d.accept() })
    await panel.locator('.side-content .panel-action', { hasText: 'Reset View' }).click()
    await panel.hover()

    const deleteBtn = panel.locator('.panel-item', { hasText: v2 }).locator('[data-item-action="delete"]').first()
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

  test('search filters view list', async ({ page }) => {
    const panel = page.locator('[data-testid="view-panel"]')
    await panel.hover()

    const names = ['Alpha View', 'Beta View']
    for (const name of names) {
      page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(name) })
      await panel.locator('[data-testid="panel-actions-trigger"]').click()
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

