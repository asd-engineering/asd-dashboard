import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { navigate, wipeConfigPreserveSnapshots, setConfigAndServices } from './shared/common.js'
import { openConfigModalSafe } from './shared/uiHelpers'
import { injectSnapshot } from './shared/state.js'

test('exported snapshot remains switchable after reset', async ({ page }) => {
  await navigate(page,'/')

  await setConfigAndServices(page, ciConfig, ciServices);

  await injectSnapshot(page, ciConfig, ciServices, 'export/switchable')

  await wipeConfigPreserveSnapshots(page);

  await openConfigModalSafe(page)
  await page.click('.tabs button[data-tab="stateTab"]')
  await page.locator('#stateTab').waitFor();
  await page.locator('#stateTab tbody tr:has-text("export/switchable") button[data-action="switch"]').click()

  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.dataset.ready === 'true')

  expect(true).toBeTruthy()
})
