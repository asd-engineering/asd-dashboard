import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { navigate, wipeConfigPreserveSnapshots, setConfigAndServices } from './shared/common.js'
import { openConfigModalSafe } from './shared/uiHelpers'
import { injectSnapshot, switchSnapshotByName } from './shared/state.js'

test('exported snapshot remains switchable after reset', async ({ page }) => {
  await navigate(page,'/')

  await setConfigAndServices(page, ciConfig, ciServices);

  await injectSnapshot(page, ciConfig, ciServices, 'export/switchable')

  await wipeConfigPreserveSnapshots(page);

  await openConfigModalSafe(page, "stateTab")

  await switchSnapshotByName(page, 'export/switchable')
})
