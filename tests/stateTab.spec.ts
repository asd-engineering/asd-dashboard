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

  test('restore and delete snapshot (direct switch, no modal)', async ({ page }) => {
    await openConfigModalSafe(page, "stateTab")
    await expect(page.locator('#stateTab tbody tr:visible')).toHaveCount(2)

    // Click switch and wait for the reload it triggers
    await Promise.all([
      page.waitForEvent('load'),
      page.locator('#stateTab tbody tr:first-child button[data-action="switch"]').click()
    ])

    await waitForAppReady(page)

    const boards = await getBoardCount(page)
    expect(boards).toBeGreaterThan(0)

    await openConfigModalSafe(page, "stateTab")

    page.on('dialog', d => d.accept())
    await page.locator('#stateTab tbody tr button:has-text("Delete")').last().click({ force: true })
    await expect(page.locator('#stateTab tbody tr:visible')).toHaveCount(2, { timeout: 2000 })

    await navigate(page, '/')

    await page.waitForSelector('#open-config-modal')
    await openConfigModalSafe(page, "stateTab")
    await expect(page.locator('#stateTab tbody tr:visible')).toHaveCount(2)
  })
})
