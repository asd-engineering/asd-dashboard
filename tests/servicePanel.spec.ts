import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { addServices, clearStorage } from './shared/common'
import { openCreateFromTopMenu, ensurePanelOpen } from './shared/panels'

// Basic structure tests for service selector panel

test.describe('Service panel', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForSelector('[data-testid="service-panel"]')
  })

  test('arrow, hidden label, visible count and DOM order', async ({ page }) => {
    const panel = page.locator('[data-testid="service-panel"]')
    await expect(panel.locator('.panel-arrow')).toHaveText('▼')
    await expect(panel.locator('.panel-label')).toHaveCount(1)
    await expect(panel.locator('.panel-label')).toBeHidden()
    await expect(panel.locator('.panel-count')).toBeVisible()

    const order = await panel.evaluate((el) => Array.from(el.children).map(c => c.className))
    expect(order.slice(0,5)).toEqual(['panel-arrow','panel-label','panel-search','panel-spacer','panel-count'])
  })

  test('flyout visibility and magnifier conditional', async ({ page }) => {
    await addServices(page, 1)
    const panel = page.locator('[data-testid="service-panel"]')
    await ensurePanelOpen(page, 'service-panel')
    const first = panel.locator('.panel-item').nth(1)
    const second = panel.locator('.panel-item').nth(2)
    await first.hover()
    await expect(first.locator('.panel-item-actions-flyout')).toBeVisible()
    await expect(first.locator('[data-item-action="navigate"]')).toHaveCount(1)
    await second.hover()
    await expect(first.locator('.panel-item-actions-flyout')).toBeHidden()
    await expect(second.locator('[data-item-action="navigate"]')).toHaveCount(0)
    await first.hover()
    await expect(first.locator('[data-item-action="delete"]')).toHaveText('❌')
  })

  test('top menu shows single create action', async ({ page }) => {
    await ensurePanelOpen(page, 'service-panel')
    const first = page.locator('[data-testid="service-panel"] .menu .menu-item').first()
    await expect(first).toHaveText(/New Service/)
  })

  test('empty state renders CTA and hides Actions', async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    const panel = page.locator('[data-testid="service-panel"]')
    await panel.hover()
    await expect(panel.locator('.panel-empty-title')).toHaveText('No Services yet')
    await expect(panel.locator('.panel-empty-cta')).toHaveCount(0)
    await expect(panel.locator('.panel-search')).toBeVisible()
  })

  test('meta column aligned regardless of navigate icon', async ({ page }) => {
    await addServices(page, 1)
    const panel = page.locator('[data-testid="service-panel"]')
    await ensurePanelOpen(page, 'service-panel')
    const firstRow = panel.locator('.panel-item').nth(1)
    const meta = firstRow.locator('.panel-item-meta')
    const before = await meta.boundingBox()
    await firstRow.hover()
    const after = await meta.boundingBox()
    const dx = Math.abs((after?.x || 0) - (before?.x || 0))
    expect(dx).toBeLessThanOrEqual(1)
  })

  test('label affordance and keyboard create', async ({ page }) => {
    const panel = page.locator('[data-testid="service-panel"]')
    await ensurePanelOpen(page, 'service-panel')
    const first = panel.locator('.panel-item').nth(1)
    await expect(first).toHaveAttribute('aria-label', /^Add:/)
    const before = await first.boundingBox()
    await first.hover()
    await expect(first.locator('.panel-item-hint')).toHaveText('Click to add')
    const after = await first.boundingBox()
    expect(Math.abs((after?.height || 0) - (before?.height || 0))).toBeLessThanOrEqual(1)
    page.once('dialog', d => d.dismiss())
    await openCreateFromTopMenu(page, 'service-panel', 'New Service')
  })
})
