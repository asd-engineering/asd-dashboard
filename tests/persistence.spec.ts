import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { handleDialog, getConfigBoards, navigate } from './shared/common'

const boardName = 'Persist Board'

test.describe('Board persistence', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page,'/')
    
  })

  test('new board persists after reload', async ({ page }) => {
    await handleDialog(page, 'prompt', boardName)
    await page.hover('[data-testid="service-menu"]')
    await page.hover('[data-testid="menu-board"]')
    await page.click('[data-testid="submenu-boards"] [data-action="create"]')
    await expect(page.locator('#board-selector')).toContainText(boardName)

    await page.reload()
    
    const boards = await getConfigBoards(page)
    expect(boards.some(b => b.name === boardName)).toBeTruthy()
  })

  test('last view persists after reload', async ({ page }) => {
    await handleDialog(page, 'prompt', 'Second View')
    await page.hover('[data-testid="service-menu"]')
    await page.hover('[data-testid="menu-view"]')
    await page.click('[data-testid="submenu-views"] [data-action="create"]')
    await expect(page.locator('#view-selector option:checked')).toHaveText('Second View')

    await page.reload()
    
    await expect(page.locator('#view-selector option:checked')).toHaveText('Second View')
  })
})
