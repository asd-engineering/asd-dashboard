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
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await ensurePanelOpen(page, 'service-panel')
  })

  // test('selects saved service and adds widget', async ({ page }) => {
  //   await page.click(`#widget-selector-panel .widget-option:has-text("${saved[0].name}")`)
  //   const iframe = page.locator('.widget-wrapper iframe').first()
  //   await expect(iframe).toHaveAttribute('src', saved[0].url)
  // })
})
