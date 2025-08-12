import { test, expect } from './fixtures'
import { addServices, getLastUsedBoardId, handleDialog, getConfigBoards, navigate } from './shared/common'
import { routeServicesConfig } from './shared/mocking'

const newBoardName = 'New Test Board'

// basic interactions with board panel

test.describe('Board Panel', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await addServices(page, 1)
  })

  test('opens side actions on hover', async ({ page }) => {
    const trigger = page.locator('[data-testid="board-panel"] [data-testid="panel-actions-trigger"]')
    await page.locator('[data-testid="board-panel"]').hover()
    await expect(trigger).toBeVisible()
    await trigger.hover()
    await expect(page.locator('[data-testid="board-panel"] .side-content')).toBeVisible()
  })

  test('create board via side action', async ({ page }) => {
    await handleDialog(page, 'prompt', newBoardName)
    await page.locator('[data-testid="board-panel"]').hover()
    await page.locator('[data-testid="board-panel"] [data-testid="panel-actions-trigger"]').hover()
    await page.locator('[data-testid="board-panel"] .side-content button', { hasText: 'Create Board' }).click()
    const boards = await getConfigBoards(page)
    const created = boards.find(b => b.name === newBoardName)
    expect(created).toBeDefined()
    const lastId = await getLastUsedBoardId(page)
    expect(lastId).toBe(created.id)
  })
})
