import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { openConfigModalSafe } from './shared/uiHelpers'
import { navigate, setConfigAndServices } from './shared/common.js'
import { injectSnapshot } from './shared/state.js'

test('switching creates autosave when existing state is present', async ({ page }) => {
  await navigate(page,'/')
  await setConfigAndServices(page, ciConfig, ciServices);

  const altCfg = { ...ciConfig, globalSettings: { ...ciConfig.globalSettings, theme: 'dark' } }
  await injectSnapshot(page, altCfg, ciServices, 'export/test')

  await openConfigModalSafe(page)
  await page.locator('#stateTab tbody tr:has-text("export/test") button[data-action="switch"]').click()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.dataset.ready === 'true')

  await openConfigModalSafe(page)
  const rows = await page.locator('#stateTab tbody tr').allInnerTexts()
  expect(rows.join('\n')).toContain('autosave/')
})
