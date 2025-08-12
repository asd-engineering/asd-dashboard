import { test, expect } from './fixtures'
import { handleDialog, getConfigBoards, getLastUsedViewId, addServices, navigate } from './shared/common'
import { routeServicesConfig } from './shared/mocking'
import { waitForWidgetStoreIdle } from './shared/state.js'

const newViewName = 'New View'

// tests for view panel actions

test.describe('View Panel', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await addServices(page, 1)
  })

  test('create view via side action', async ({ page }) => {
    await handleDialog(page, 'prompt', newViewName)
    await page.locator('[data-testid="view-panel"]').hover()
    await page.locator('[data-testid="view-panel"] [data-testid="panel-actions-trigger"]').hover()
    await page.locator('[data-testid="view-panel"] .side-content button', { hasText: 'Create View' }).click()
    const boards = await getConfigBoards(page)
    const boardId = await page.locator('.board').getAttribute('id')
    const board = boards.find(b => b.id === boardId)
    const created = board.views.find(v => v.name === newViewName)
    expect(created).toBeDefined()
    const lastId = await getLastUsedViewId(page)
    expect(lastId).toBe(created.id)
  })

  test('reset view', async ({ page }) => {
    await handleDialog(page, 'confirm')
    await page.locator('[data-testid="view-panel"]').hover()
    await page.locator('[data-testid="view-panel"] [data-testid="panel-actions-trigger"]').hover()
    await page.locator('[data-testid="view-panel"] .side-content button', { hasText: 'Reset View' }).click()
    await page.waitForFunction(() => {
      const container = document.getElementById('widget-container')
      return container && container.querySelectorAll('.widget-wrapper').length === 0
    })
    await waitForWidgetStoreIdle(page)
  })
})
