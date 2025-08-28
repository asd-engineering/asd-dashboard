import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { openConfigModalSafe } from './shared/uiHelpers'
import { navigate, setConfigAndServices } from './shared/common.js'
import { injectSnapshot, switchSnapshotByName } from './shared/state.js'

test('switching creates autosave when existing state is present', async ({ page }) => {
  await navigate(page,'/')
  await setConfigAndServices(page, ciConfig, ciServices);

  const altCfg = { ...ciConfig, globalSettings: { ...ciConfig.globalSettings, theme: 'dark' } }
  await injectSnapshot(page, altCfg, ciServices, 'export/test')
  await switchSnapshotByName(page, 'export/test')

  await openConfigModalSafe(page)
  const rows = await page.locator('#stateTab tbody tr').allInnerTexts()
  expect(rows.join('\n')).toContain('autosave/')
})
