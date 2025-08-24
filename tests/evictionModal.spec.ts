import { test, expect } from './fixtures'

// Tests for the eviction modal multi-select and LRU auto-selection

declare global {
  interface Window {
    evictPromise: Promise<Array<{ id: string, title: string }> | null>
  }
}

test.describe('Eviction Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(() => document.body.dataset.ready === 'true')
  })

  test('supports multi-select and auto-select LRU', async ({ page }) => {
    await page.evaluate(async () => {
      const { openEvictionModal } = await import('/component/modal/evictionModal.js')
      const mk = (id, title) => {
        const el = document.createElement('div')
        el.dataset.dataid = id
        el.dataset.metadata = JSON.stringify({ title })
        return el
      }
      const widgets = new Map([
        ['a', mk('a', 'A')],
        ['b', mk('b', 'B')],
        ['c', mk('c', 'C')]
      ])
      // open modal requiring two removals
      window.evictPromise = openEvictionModal(widgets, 2)
    })

    const modal = page.locator('#eviction-modal')
    await expect(modal).toBeVisible()
    await expect(modal.locator('p').first()).toHaveText('2 widgets must be removed to continue navigation.')

    const checkboxes = modal.locator('#eviction-list input[type="checkbox"]')
    await expect(checkboxes).toHaveCount(3)

    const counter = modal.locator('#eviction-counter')
    await expect(counter).toHaveText('0 of 2 widgets selected')

    // Manual selection
    await checkboxes.nth(0).check()
    await expect(counter).toHaveText('1 of 2 widgets selected')
    await expect(checkboxes.nth(2)).not.toBeDisabled()
    await checkboxes.nth(1).check()
    await expect(counter).toHaveText('2 of 2 widgets selected')
    await expect(checkboxes.nth(2)).toBeDisabled()

    const removeBtn = modal.locator('button:has-text("Remove")')
    await expect(removeBtn).toBeEnabled()

    // Uncheck to re-enable
    await checkboxes.nth(1).uncheck()
    await expect(counter).toHaveText('1 of 2 widgets selected')
    await expect(checkboxes.nth(2)).not.toBeDisabled()
    await expect(removeBtn).toBeDisabled()

    // Auto-select LRU
    const autoBtn = modal.locator('#evict-lru-btn')
    await autoBtn.click()
    await expect(counter).toHaveText('2 of 2 widgets selected')
    await expect(checkboxes.nth(0)).toBeChecked()
    await expect(checkboxes.nth(1)).toBeChecked()
    await expect(checkboxes.nth(2)).toBeDisabled()

    await removeBtn.click()
    await expect(modal).toBeHidden()

    const result = await page.evaluate(() => window.evictPromise)
    expect(result.map(r => r.id)).toEqual(['a', 'b'])
  })
})
