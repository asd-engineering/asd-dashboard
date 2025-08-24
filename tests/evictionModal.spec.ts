import { test, expect } from './fixtures'

declare global {
  interface Window { evicted: string[] }
}

test.describe('Eviction Modal v2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(() => document.body.dataset.ready === 'true')
  })

  test('undefined-requiredCount: auto-select LRU selects exactly 1 and navigates immediately', async ({ page }) => {
    await page.evaluate(async () => {
      const { openEvictionModal } = await import('/component/modal/evictionModal.js')
      const items = [
        { id: 'a', title: 'A', icon: '🧱', boardIndex: 0, viewIndex: 0, lruRank: 0 },
        { id: 'b', title: 'B', icon: '🧱', boardIndex: 0, viewIndex: 1, lruRank: 1 }
      ]
      window.evicted = []
      openEvictionModal({
        reason: 'test',
        maxPerService: 5,
        requiredCount: null,
        items,
        onEvict: async ids => { window.evicted = ids }
      })
    })
    const modal = page.locator('#eviction-modal')
    await expect(modal).toBeVisible()
    await expect(modal.locator('#eviction-header')).toHaveText('1 widget must be removed to continue navigation.')
    await expect(modal.locator('#eviction-counter')).toHaveText('0 of 1 widgets selected')
    await modal.locator('#evict-lru-btn').click()
    await expect(modal).toBeHidden()
    const evicted = await page.evaluate(() => window.evicted)
    expect(evicted).toEqual(['a'])
  })

  test('defined-requiredCount: manual selection up to N enables Continue and evicts', async ({ page }) => {
    await page.evaluate(async () => {
      const { openEvictionModal } = await import('/component/modal/evictionModal.js')
      const mk = (id, title, boardIndex, viewIndex, lruRank) => ({ id, title, icon: '🧱', boardIndex, viewIndex, lruRank })
      const items = [mk('a', 'A', 0, 0, 0), mk('b', 'B', 0, 1, 1), mk('c', 'C', 1, 0, 2)]
      window.evicted = []
      openEvictionModal({
        reason: 'test',
        maxPerService: 5,
        requiredCount: 2,
        items,
        onEvict: async ids => { window.evicted = ids }
      })
    })
    const modal = page.locator('#eviction-modal')
    await expect(modal).toBeVisible()
    await expect(modal.locator('#eviction-header')).toHaveText('2 widgets must be removed to continue navigation.')
    const listItems = modal.locator('#eviction-list label')
    await expect(listItems).toHaveCount(3)
    await expect(listItems.nth(1)).toContainText('Board 1, View 2')
    const counter = modal.locator('#eviction-counter')
    await expect(counter).toHaveText('0 of 2 widgets selected')
    const boxes = modal.locator('#eviction-list input[type="checkbox"]')
    await boxes.nth(0).check()
    await expect(counter).toHaveText('1 of 2 widgets selected')
    const continueBtn = modal.locator('button:has-text("Continue")')
    await expect(continueBtn).toBeDisabled()
    await boxes.nth(1).check()
    await expect(counter).toHaveText('2 of 2 widgets selected')
    await expect(continueBtn).toBeEnabled()
    await continueBtn.click()
    await expect(modal).toBeHidden()
    const evicted = await page.evaluate(() => window.evicted)
    expect(evicted).toEqual(['a', 'b'])
  })

  test('LRU flow: auto-select removes correct N by rank', async ({ page }) => {
    await page.evaluate(async () => {
      const { openEvictionModal } = await import('/component/modal/evictionModal.js')
      const items = [
        { id: 'a', title: 'A', icon: '🧱', boardIndex: 0, viewIndex: 0, lruRank: 0 },
        { id: 'b', title: 'B', icon: '🧱', boardIndex: 0, viewIndex: 1, lruRank: 1 },
        { id: 'c', title: 'C', icon: '🧱', boardIndex: 1, viewIndex: 0, lruRank: 2 }
      ]
      window.evicted = []
      openEvictionModal({
        reason: 'test',
        maxPerService: 5,
        requiredCount: 2,
        items,
        onEvict: async ids => { window.evicted = ids }
      })
    })
    const modal = page.locator('#eviction-modal')
    await expect(modal).toBeVisible()
    await modal.locator('#evict-lru-btn').click()
    await expect(modal).toBeHidden()
    const evicted = await page.evaluate(() => window.evicted)
    expect(evicted).toEqual(['a', 'b'])
  })

  test('Cancel leaves state unchanged', async ({ page }) => {
    await page.evaluate(async () => {
      const { openEvictionModal } = await import('/component/modal/evictionModal.js')
      const items = [
        { id: 'a', title: 'A', icon: '🧱', boardIndex: 0, viewIndex: 0, lruRank: 0 }
      ]
      window.evicted = []
      openEvictionModal({
        reason: 'test',
        maxPerService: 5,
        requiredCount: 1,
        items,
        onEvict: async ids => { window.evicted = ids }
      })
    })
    const modal = page.locator('#eviction-modal')
    await expect(modal).toBeVisible()
    await modal.locator('button:has-text("Cancel")').click()
    await expect(modal).toBeHidden()
    const evicted = await page.evaluate(() => window.evicted)
    expect(evicted).toEqual([])
  })
})
