import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { getBoardCount, navigate, clearStorage } from './shared/common.js'
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
    await injectSnapshot(page, altCfg, svc, 'two')
    await page.waitForSelector('dialog.user-notification', { state: 'detached' }).catch(() => {})
  })

  test('restore and delete snapshot (direct switch, no modal)', async ({ page }) => {
    await page.reload()
    await openConfigModalSafe(page)

    await page.click('.tabs button[data-tab="stateTab"]')
    await page.locator('#stateTab').waitFor();
    await expect(page.locator('#stateTab tbody tr:visible')).toHaveCount(2)

    await page.locator('#stateTab tbody tr:first-child button[data-action="switch"]').click()

    // SPA reload pattern (see AGENTS.md “Best Practices”)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForFunction(() => document.body.dataset.ready === 'true')

    const boards = await getBoardCount(page)
    expect(boards).toBeGreaterThan(0)

    await openConfigModalSafe(page)
    await page.click('.tabs button[data-tab="stateTab"]')
    await page.locator('#stateTab').waitFor();
    page.on('dialog', d => d.accept())
    await page.locator('#stateTab tbody tr button:has-text("Delete")').last().click({ force: true })
    await expect(page.locator('#stateTab tbody tr:visible')).toHaveCount(2, { timeout: 2000 })

    await navigate(page, '/')
    await page.waitForSelector('#open-config-modal')
    await openConfigModalSafe(page)
    await page.click('.tabs button[data-tab="stateTab"]')
    await page.locator('#stateTab').waitFor();
    await expect(page.locator('#stateTab tbody tr:visible')).toHaveCount(2)
  })
})
