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

  test('renders header label and hides count', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    await expect(panel.locator('.panel-arrow')).toHaveText('▼')
    await expect(panel.locator('.panel-label')).toHaveText(/Board:\s+/)
    await expect(panel.locator('.panel-label')).not.toContainText('▼')
    await expect(panel.locator('.panel-count')).toHaveCount(0)
  })

  test('opens dropdown and shows Actions ▸', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    await panel.hover()
    await expect(panel.locator('.dropdown-content')).toBeVisible()
    await expect(panel.locator('[data-testid="panel-actions-trigger"]')).toBeVisible()
  })

  test('side opens on hover', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    await panel.hover()
    const trigger = panel.locator('[data-testid="panel-actions-trigger"]')
    await trigger.hover()
    await expect(panel.locator('.dropdown-content.side-open .side-content')).toBeVisible()
  })

  test('Actions ▸ focus ring visible via keyboard', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    await panel.focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Tab') // focus search
    await page.keyboard.press('Tab') // focus Actions ▸
    const trigger = panel.locator('[data-testid="panel-actions-trigger"]')
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveCSS('outline-style', 'solid')
  })

  test('Actions ▸ → New Board creates a board', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    const newName = 'Playwright Board'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(newName) })
    await panel.hover()
    const trigger = panel.locator('[data-testid="panel-actions-trigger"]')
    await trigger.hover()
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
    await expect(renameBtn).toHaveText('✏️')
    const renamed = 'Renamed Board'
    page.once('dialog', async d => { expect(d.type()).toBe('prompt'); await d.accept(renamed) })
    await renameBtn.click()
    await expect(panel.locator('.panel-item', { hasText: renamed })).toBeVisible()

    const deleteBtn = panel.locator('.panel-item', { hasText: renamed }).locator('[data-item-action="delete"]').first()
    await expect(deleteBtn).toHaveText('⛔')
    page.once('dialog', async d => { expect(d.type()).toBe('confirm'); await d.accept() })
    await deleteBtn.click()
    await expect(panel.locator('.panel-item', { hasText: renamed })).toHaveCount(0)
  })

  test('keyboard interactions', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    await panel.focus()
    await page.keyboard.press('Enter')
    await expect(panel.locator('.dropdown-content')).toBeVisible()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('ArrowRight')
    await expect(panel.locator('.dropdown-content.side-open .side-content')).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(panel.locator('.dropdown-content.side-open .side-content')).toHaveCount(0)
    await panel.focus()
    await page.keyboard.press('Escape')
    await expect(panel.locator('.dropdown-content')).toBeHidden()
  })

  test('item icons hover styling', async ({ page }) => {
    const panel = page.locator('[data-testid="board-panel"]')
    await panel.hover()
    const icon = panel.locator('[data-item-action="rename"]').first()
    await expect(icon).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await icon.hover()
    await expect(icon).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.06)')
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

