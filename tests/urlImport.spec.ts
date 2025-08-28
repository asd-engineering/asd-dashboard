import { test, expect } from './fixtures'
import { ciConfig, ciBoards } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { gzipJsonToBase64url } from '../src/utils/compression.js'
import { openConfigModalSafe } from './shared/uiHelpers'
import { bootWithDashboardState } from './shared/bootState.js'
import { navigate } from './shared/common.js'

test('URL import stores snapshot and remains switchable', async ({ page }) => {
  const cfgEnc = await gzipJsonToBase64url({ ...ciConfig, boards: ciBoards })
  const svcEnc = await gzipJsonToBase64url(ciServices)

  await bootWithDashboardState(
    page,
    { globalSettings: { theme: 'dark' }, boards: [] },
    [],
    { board: '', view: '' },
    `/#cfg=${cfgEnc}&svc=${svcEnc}`
  )

  await page.waitForSelector('#fragment-decision-modal')
  await page.click('#fragment-decision-modal button#switch-environment')

  // Wait for first boot to complete
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.dataset.ready === 'true')

  await openConfigModalSafe(page)
  await page.click('.tabs button[data-tab="stateTab"]')

  await expect(
    page.locator('#stateTab tbody tr:not(.hc-details-row)').first().locator('td[data-col="type"]')
  ).toHaveText(/imported/i)

  // wipe persistent state
  await page.evaluate(() => {
    localStorage.removeItem('config')
    localStorage.removeItem('services')
    localStorage.removeItem('lastUsedBoardId')
    localStorage.removeItem('lastUsedViewId')
  })

  // Reboot SPA
  await navigate(page, '/')

  await openConfigModalSafe(page)
  await page.click('.tabs button[data-tab="stateTab"]')

  await page
    .locator('#stateTab tbody tr:not(.hc-details-row):has-text("Imported")')
    .locator('button[data-action="switch"]')
    .click()

  // Wait for the reload sequence after switching snapshot
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.dataset.ready === 'true')

  // Instead of immediate evaluate, poll until config is populated
  const boardCount = await page.waitForFunction(() => {
    try {
      return import('/storage/StorageManager.js').then(m => {
        const cfg = m.default.getConfig()
        return cfg && cfg.boards && cfg.boards.length
      })
    } catch {
      return 0
    }
  })

  expect(await boardCount.jsonValue()).toBeGreaterThan(0)
})
