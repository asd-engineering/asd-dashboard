import { test } from './fixtures'
import { routeServicesConfig } from './shared/mocking.js'
import { selectServiceByName, navigate } from './shared/common.js'
import { bootWithDashboardState } from './shared/bootState.js'
import { ensurePanelOpen } from './shared/panels'

const saved = [{ name: 'Saved Service', url: 'http://localhost/saved' }]

test.describe('Use saved service', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await bootWithDashboardState(page, {}, saved, { board: '', view: '' })
  })

  test('selects saved service and adds widget', async ({ page }) => {
    await selectServiceByName(page, saved[0].name);
    await navigate(page, '/')
    await ensurePanelOpen(page, 'service-panel')
  })
})
