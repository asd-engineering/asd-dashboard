import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { navigate, addServices } from './shared/common'

// Tests for board selector panel with item icons and side actions
test.describe('Board panel', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await addServices(page, 1)
  })

  test('opens dropdown and shows Actions ▸', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    await panel.hover()
    await expect(panel.locator('.dropdown-content')).toBeVisible()
    await expect(panel.locator('[data-testid="panel-actions-trigger"]')).toBeVisible()
  })

  test('Actions ▸ → New Board creates a board', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    const newName = 'Playwright Board'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(newName) })
    await panel.hover()
    await panel.locator('[data-testid="panel-actions-trigger"]').click()
    await expect(panel.locator('.dropdown-content.side-open .side-content')).toBeVisible()
    await panel.locator('.side-content .panel-action', { hasText: 'New Board' }).click()
    await panel.hover()
    await expect(panel.locator('.panel-item', { hasText: newName })).toBeVisible()
  })

  test('per-item rename and delete icons', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    await panel.hover()

    const initial = 'Temp Board'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(initial) })
    await panel.locator('[data-testid="panel-actions-trigger"]').click()
    await panel.locator('.side-content .panel-action', { hasText: 'New Board' }).click()
    await panel.hover()
    await expect(panel.locator('.panel-item', { hasText: initial })).toBeVisible()

    const renameBtn = panel.locator('.panel-item', { hasText: initial }).locator('[data-item-action="rename"]').first()
    const renamed = 'Renamed Board'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(renamed) })
    await renameBtn.click()
    await expect(panel.locator('.panel-item', { hasText: renamed })).toBeVisible()

    const deleteBtn = panel.locator('.panel-item', { hasText: renamed }).locator('[data-item-action="delete"]').first()
    page.once('dialog', async d => { expect(d.type()).toBe('confirm'); await d.accept() })
    await deleteBtn.click()
    await expect(panel.locator('.panel-item', { hasText: renamed })).toHaveCount(0)
  })

  test('search filters boards but keeps Actions ▸', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    await panel.hover()

    const names = ['Alpha Board', 'Beta Board']
    for (const name of names) {
      page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(name) })
      await panel.locator('[data-testid="panel-actions-trigger"]').click()
      await panel.locator('.side-content .panel-action', { hasText: 'New Board' }).click()
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

