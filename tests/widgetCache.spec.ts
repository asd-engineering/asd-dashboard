import { test, expect } from '@playwright/test'
import { routeServicesConfig } from './shared/mocking'
import { addServicesByName, handleDialog } from './shared/common'

// Ensure widget DOM nodes are reused when switching views or boards

test.describe('Widget cache', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await addServicesByName(page, 'ASD-terminal', 1)
  })

  test('persists iframe when switching views', async ({ page }) => {
    const original = await page.locator('.widget-wrapper iframe').first().elementHandle()

    await handleDialog(page, 'prompt', 'Second View')
    await page.click('#view-dropdown .dropbtn')
    await page.click('#view-control a[data-action="create"]')

    await page.selectOption('#view-selector', { index: 0 })

    const after = await page.locator('.widget-wrapper iframe').first().elementHandle()
    const same = await page.evaluate(([a, b]) => a === b, [original, after])
    expect(same).toBe(true)
  })

  test('persists iframe when switching boards', async ({ page }) => {
    const original = await page.locator('.widget-wrapper iframe').first().elementHandle()

    await handleDialog(page, 'prompt', 'Board Two')
    await page.click('#board-dropdown .dropbtn')
    await page.click('#board-control a[data-action="create"]')

    await page.selectOption('#board-selector', { index: 0 })

    const after = await page.locator('.widget-wrapper iframe').first().elementHandle()
    const same = await page.evaluate(([a, b]) => a === b, [original, after])
    expect(same).toBe(true)
  })
})
