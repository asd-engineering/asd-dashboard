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
    await page.locator('[data-testid="board-panel"]').hover()
    await page.locator('[data-testid="board-panel"] [data-testid="panel-actions-trigger"]').click()
    await page.locator('[data-testid="board-panel"] .side-content .panel-action', { hasText: 'New Board' }).click()
    await page.locator('[data-testid="board-panel"]').hover()
    await expect(page.locator('#board-selector')).toContainText(boardName)

    await page.reload()
    
    const boards = await getConfigBoards(page)
    expect(boards.some(b => b.name === boardName)).toBeTruthy()
  })

  test('last view persists after reload', async ({ page }) => {
    await handleDialog(page, 'prompt', 'Second View')
    await page.locator('[data-testid="view-panel"]').hover()
    await page.locator('[data-testid="view-panel"] [data-testid="panel-actions-trigger"]').click()
    await page.locator('[data-testid="view-panel"] .side-content .panel-action', { hasText: 'New View' }).click()
    await page.locator('[data-testid="view-panel"]').hover()
    await expect(page.locator('#view-selector option:checked')).toHaveText('Second View')

    await page.reload()
    
    await expect(page.locator('#view-selector option:checked')).toHaveText('Second View')
  })
})
