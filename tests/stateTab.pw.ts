import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { getBoardCount, navigate, clearStorage, waitForAppReady } from './shared/common.js'
import { injectSnapshot } from './shared/state.js'
import { openConfigModalSafe } from './shared/uiHelpers'

test.describe('Snapshots & Share tab', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page)
    await navigate(page,'/')
    const cfg = ciConfig
    const svc = ciServices
    await injectSnapshot(page, cfg, svc, 'one')
    const altCfg = { ...ciConfig, globalSettings: { ...ciConfig.globalSettings, theme: 'dark' } }
    await injectSnapshot(page, altCfg, svc, 'two', { reload: true })
    await page.waitForSelector('dialog.user-notification', { state: 'detached' }).catch(() => {})
  })

  test('restore and delete snapshot (direct switch, no modal)', async ({ page }, testInfo) => {
    // Extend timeout for Firefox due to multiple reloads and IndexedDB operations
    if (testInfo.project.name === 'firefox') {
      test.setTimeout(30000)
    }
    await openConfigModalSafe(page, "stateTab")
    await expect(page.locator('#stateTab tbody tr:visible')).toHaveCount(2)

    // Click switch and wait for the reload it triggers
    // Use longer timeout for Firefox CI stability
    await Promise.all([
      page.waitForEvent('load', { timeout: 10000 }),
      page.locator('#stateTab tbody tr:first-child button[data-action="switch"]').click({ force: true })
    ])

    await waitForAppReady(page)
    // Extra wait for Firefox to stabilize after IndexedDB operations
    await page.waitForSelector('[data-testid="board-panel"]', { timeout: 10000 }).catch(() => {})

    const boards = await getBoardCount(page)
    expect(boards).toBeGreaterThan(0)

    await openConfigModalSafe(page, "stateTab")

    page.on('dialog', d => d.accept())
    await page.locator('#stateTab tbody tr button:has-text("Delete")').last().click({ force: true })
    await expect(page.locator('#stateTab tbody tr:visible')).toHaveCount(2, { timeout: 2000 })

    // Close modal before navigating to ensure clean state
    await page.keyboard.press('Escape')
    await page.waitForSelector('#configModal', { state: 'detached', timeout: 5000 }).catch(() => {})

    // Wait for any pending operations before navigation
    await page.waitForTimeout(500)
    await navigate(page, '/')

    await page.waitForSelector('#open-config-modal', { timeout: 10000 })
    await openConfigModalSafe(page, "stateTab")
    await expect(page.locator('#stateTab tbody tr:visible')).toHaveCount(2)
  })
})
