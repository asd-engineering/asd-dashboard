import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking.js'
import { selectServiceByName } from './shared/common.js'
import { bootWithDashboardState } from './shared/bootState.js'

const saved = [{ name: 'Saved Service', url: 'http://localhost/saved' }]

test.describe('Use saved service', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await bootWithDashboardState(page, {}, saved, { board: '', view: '' })
  })

  test('selects saved service and adds widget', async ({ page }) => {
    await selectServiceByName(page, saved[0].name);
    const iframe = page.locator('.widget-wrapper iframe').first()
    await expect(iframe).toHaveAttribute('src', saved[0].url)
  })
})
