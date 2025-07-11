import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { handleDialog, getConfigBoards, waitForDashboardReady } from './shared/common'

const boardName = 'Persist Board'

test.describe('Board persistence', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await waitForDashboardReady(page)
  })

  test('new board persists after reload', async ({ page }) => {
    await handleDialog(page, 'prompt', boardName)
    await page.click('#board-dropdown .dropbtn')
    await page.click('#board-control a[data-action="create"]')
    await expect(page.locator('#board-selector')).toContainText(boardName)

    await page.reload()
    await waitForDashboardReady(page)
    const boards = await getConfigBoards(page)
    expect(boards.some(b => b.name === boardName)).toBeTruthy()
  })

  test('last view persists after reload', async ({ page }) => {
    await handleDialog(page, 'prompt', 'Second View')
    await page.click('#view-dropdown .dropbtn')
    await page.click('#view-control a[data-action="create"]')
    await expect(page.locator('#view-selector option:checked')).toHaveText('Second View')

    await page.reload()
    await waitForDashboardReady(page)
    await expect(page.locator('#view-selector option:checked')).toHaveText('Second View')
  })
})
