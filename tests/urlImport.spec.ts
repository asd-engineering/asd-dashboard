// tests/urlImport.spec.ts
import { test, expect } from './fixtures'
import { ciConfig, ciBoards } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { gzipJsonToBase64url } from '../src/utils/compression.js'
import { openConfigModalSafe } from './shared/uiHelpers'
import { bootWithDashboardState } from './shared/bootState.js'
import { navigate, getUnwrappedConfig, wipeConfigPreserveSnapshots } from './shared/common.js'

test('URL import stores snapshot and remains switchable', async ({ page }) => {
  const cfgEnc = await gzipJsonToBase64url({ ...ciConfig, boards: ciBoards })
  const svcEnc = await gzipJsonToBase64url(ciServices)

  await bootWithDashboardState(
    page,
    { globalSettings: { theme: 'dark' }, boards: [] },
    [],
    { board: '', view: '' },
    `/#cfg=${cfgEnc}&svc=${svcEnc}`,
    { waitForReady: false }
  )

  // Decide to switch to the imported environment
  await page.waitForSelector('#fragment-decision-modal', { state: 'visible' })
  await page.click('#fragment-decision-modal button#switch-environment')

  // Wait for first boot to complete (SPA-ready gate)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.dataset.ready === 'true')

  // Verify snapshot is registered as Imported
  await openConfigModalSafe(page, "stateTab")

  await expect(
    page.locator('#stateTab tbody tr:not(.hc-details-row)').first().locator('td[data-col="type"]')
  ).toHaveText(/imported/i)

  // Wipe persistent state (simulate fresh boot)
  await wipeConfigPreserveSnapshots(page);

  // Reboot SPA
  await navigate(page, '/')

  // Open the state tab again and switch to the Imported snapshot
  await openConfigModalSafe(page, "stateTab")

  await page
    .locator('#stateTab tbody tr:not(.hc-details-row):has-text("Imported")')
    .locator('button[data-action="switch"]')
    .click()

  // Wait for the reload sequence after switching snapshot
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.dataset.ready === 'true')

  const cfg = await getUnwrappedConfig(page);
  expect((cfg.boards || []).length).toBeGreaterThan(0);
})
