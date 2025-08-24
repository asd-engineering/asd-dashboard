import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { getBoardCount, navigate } from './shared/common.js'
import { injectSnapshot } from './shared/state.js'
import { openConfigModalSafe } from './shared/uiHelpers'

test.describe('Saved States tab', () => {
  test.beforeEach(async ({ page }) => {
    await navigate(page,'/')

    const cfg = ciConfig
    const svc = ciServices
    await injectSnapshot(page, cfg, svc, 'one')
    const altCfg = { ...ciConfig, globalSettings: { ...ciConfig.globalSettings, theme: 'dark' } }
    await injectSnapshot(page, altCfg, svc, 'two')
    await page.waitForSelector('dialog.user-notification', { state: 'detached' }).catch(() => {})
  })

  test('restore and delete snapshot', async ({ page }) => {
    await page.reload()
    await openConfigModalSafe(page)

    await page.click('.tabs button[data-tab="stateTab"]')
    await expect(page.locator('#stateTab tbody tr')).toHaveCount(2)

    await page.locator('#stateTab tbody tr:first-child button[data-action="switch"]').click()
    
    await page.click('#switch-environment')
    await page.waitForLoadState('domcontentloaded')
    
    // Wait for a stable element on the new page to appear.
    // This prevents the "Execution context was destroyed" race condition.
    await page.waitForSelector('[data-testid="board-panel"]');
    
    await page.waitForFunction(() => document.body.dataset.ready === 'true')

    const boards = await getBoardCount(page);
    expect(boards).toBeGreaterThan(0)

      await openConfigModalSafe(page)
    await page.click('.tabs button[data-tab="stateTab"]')
    page.on('dialog', d => d.accept())
    await page.locator('#stateTab tbody tr button:has-text("Delete")').last().click()
    await expect(page.locator('#stateTab tbody tr')).toHaveCount(1)

    await navigate(page, '/')
    await page.waitForSelector('#open-config-modal')
    await openConfigModalSafe(page)
    await page.click('.tabs button[data-tab="stateTab"]')
    await expect(page.locator('#stateTab tbody tr')).toHaveCount(1)
  })
})