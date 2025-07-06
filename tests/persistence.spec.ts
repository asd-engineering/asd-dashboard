import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { handleDialog, getBoardsFromLocalStorage } from './shared/common'

const boardName = 'Persist Board'

test.describe('Board persistence', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('new board persists after reload', async ({ page }) => {
    await handleDialog(page, 'prompt', boardName)
    await page.click('#board-dropdown .dropbtn')
    await page.click('#board-control a[data-action="create"]')
    await expect(page.locator('#board-selector')).toContainText(boardName)

    await page.reload()
    const boards = await getBoardsFromLocalStorage(page)
    expect(boards.some(b => b.name === boardName)).toBeTruthy()
  })
})
