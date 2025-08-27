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
  await bootWithDashboardState(page, { globalSettings: { theme: 'dark' }, boards: [] }, [], { board: '', view: '' }, `/#cfg=${cfgEnc}&svc=${svcEnc}`)
  await page.waitForSelector('#fragment-decision-modal')
  await page.locator('#fragment-decision-modal button#switch-environment').click()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.dataset.ready === 'true')
  await openConfigModalSafe(page)
  await page.click('.tabs button[data-tab="stateTab"]')
  await expect(page.locator('#stateTab tbody tr:first-child td:nth-child(2)')).toHaveText('imported')
  await page.evaluate(() => {
    localStorage.removeItem('config')
    localStorage.removeItem('services')
    localStorage.removeItem('lastUsedBoardId')
    localStorage.removeItem('lastUsedViewId')
  })
  await navigate(page,'/')
  await openConfigModalSafe(page)
  await page.click('.tabs button[data-tab="stateTab"]')
  await page.locator('#stateTab tbody tr:has-text("Imported") button[data-action="switch"]').click()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.dataset.ready === 'true')
  await page.waitForSelector('#open-config-modal')
  const boardCount = await page.evaluate(async () => {
    const { default: sm } = await import('/storage/StorageManager.js')
    return sm.getConfig().boards.length
  })
  expect(boardCount).toBeGreaterThan(0)
})
