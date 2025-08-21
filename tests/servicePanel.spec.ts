import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { addServices } from './shared/common'

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
    expect(order.slice(0,4)).toEqual(['panel-arrow','panel-label','panel-search','panel-count'])
  })

    test('icons toggle visibility and magnifier conditional', async ({ page }) => {
      await addServices(page, 1)
      const panel = page.locator('[data-testid="service-panel"]')
      await panel.hover()
      const first = panel.locator('.panel-item').nth(1)
    const second = panel.locator('.panel-item').nth(2)
    const firstActs = first.locator('.panel-item-actions')
      await expect(firstActs).toHaveCSS('opacity', '0')
      await first.hover()
      await expect(firstActs).toHaveCSS('opacity', '1')
      await second.hover()
      await expect(firstActs).toHaveCSS('opacity', '0')
      await expect(first.locator('[data-item-action="navigate"]')).toHaveCount(1)
      await expect(second.locator('[data-item-action="navigate"]')).toHaveCount(0)
      await first.hover()
      await expect(first.locator('[data-item-action="delete"]')).toHaveText('❌')
    })

    test('shows header CTA and hides Actions row for single action', async ({ page }) => {
      const panel = page.locator('[data-testid="service-panel"]')
      await expect(panel.locator('.panel-cta')).toHaveText('New Service')
      await panel.hover()
      await expect(panel.locator('[data-testid="panel-actions-trigger"]')).toHaveCount(0)
    })

    test('empty state renders message and big CTA', async ({ page }) => {
      await page.evaluate(() => {
        window.localStorage.setItem('services', '[]')
        document.dispatchEvent(new CustomEvent('state-change', { detail: { reason: 'services' } }))
      })
      await page.reload()
      await page.waitForSelector('[data-testid="service-panel"]')
      const panel = page.locator('[data-testid="service-panel"]')
      await panel.hover()
      await expect(panel.locator('.panel-empty-title')).toHaveText('No Services yet')
      await expect(panel.locator('.panel-cta')).toHaveText('+ New Service')
      await expect(panel.locator('.panel-search')).toBeVisible()
      await expect(panel.locator('[data-testid="panel-actions-trigger"]')).toHaveCount(0)
      await page.evaluate(() => window.localStorage.removeItem('services'))
    })

    test('meta alignment unaffected by navigate icon', async ({ page }) => {
      await addServices(page, 1)
      const panel = page.locator('[data-testid="service-panel"]')
      await panel.hover()
      const firstMeta = await panel.locator('.panel-item').nth(1).locator('.panel-item-meta').boundingBox()
      const secondMeta = await panel.locator('.panel-item').nth(2).locator('.panel-item-meta').boundingBox()
      const dx = Math.abs((firstMeta?.x || 0) - (secondMeta?.x || 0))
      expect(dx).toBeLessThanOrEqual(1)
    })

    test('label hint and aria reflect Add action', async ({ page }) => {
      const panel = page.locator('[data-testid="service-panel"]')
      await panel.hover()
      const row = panel.locator('.panel-item').nth(1)
      await expect(row).toHaveAttribute('aria-label', /^Add:/)
      await row.hover()
      await expect(row.locator('.panel-item-hint')).toHaveText('Click to add')
    })
  })
