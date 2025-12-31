import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { handleDialog, getConfigBoards, navigate } from './shared/common'
import { openCreateFromTopMenu, ensurePanelOpen } from './shared/panels'
import { enableUITestMode } from './shared/uiHelpers';

const boardName = 'Persist Board'

test.describe('Board persistence', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page,'/')
    await enableUITestMode(page);
  })

  test('new board persists after reload', async ({ page }) => {
    await handleDialog(page, 'prompt', boardName)
    await openCreateFromTopMenu(page, 'board-panel', 'New Board')
    await ensurePanelOpen(page, 'board-panel')
    await expect(page.locator('#board-selector')).toContainText(boardName)

    await page.reload()
    
    const boards = await getConfigBoards(page)
    expect(boards.some(b => b.name === boardName)).toBeTruthy()
  })

  test('last view persists after reload', async ({ page }) => {
    await handleDialog(page, 'prompt', 'Second View')
    await openCreateFromTopMenu(page, 'view-panel', 'New View')
    await ensurePanelOpen(page, 'view-panel')
    await expect(page.locator('#view-selector option:checked')).toHaveText('Second View')

    await page.reload()
    
    await expect(page.locator('#view-selector option:checked')).toHaveText('Second View')
  })
})
