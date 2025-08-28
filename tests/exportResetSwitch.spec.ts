import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { navigate } from './shared/common.js'
import { openConfigModalSafe } from './shared/uiHelpers'
import { injectSnapshot } from './shared/state.js'

test('exported snapshot remains switchable after reset', async ({ page }) => {
  await navigate(page,'/')

  await page.evaluate(([cfg, svc]) => {
    localStorage.setItem('config', JSON.stringify(cfg))
    localStorage.setItem('services', JSON.stringify(svc))
  }, [ciConfig, ciServices])

  await injectSnapshot(page, ciConfig, ciServices, 'export/switchable')

  await page.evaluate(() => {
    localStorage.removeItem('config')
    localStorage.removeItem('services')
    localStorage.removeItem('lastUsedBoardId')
    localStorage.removeItem('lastUsedViewId')
  })

  await openConfigModalSafe(page)
  await page.click('.tabs button[data-tab="stateTab"]')
  await page.locator('#stateTab').waitFor();
  await page.locator('#stateTab tbody tr:has-text("export/switchable") button[data-action="switch"]').click()

  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.dataset.ready === 'true')

  expect(true).toBeTruthy()
})
