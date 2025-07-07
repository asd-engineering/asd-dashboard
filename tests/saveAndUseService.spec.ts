import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking.js'
import { ensurePanelOpen } from './shared/common'

const saved = [{ name: 'Saved Service', url: 'http://localhost/saved' }]

test.describe('Use saved service', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(value => {
      localStorage.setItem('services', value)
    }, JSON.stringify(saved))
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await ensurePanelOpen(page)
  })

  test('selects saved service and adds widget', async ({ page }) => {
    await page.click(`#widget-selector-panel .widget-option:has-text("${saved[0].name}")`)
    const iframe = page.locator('.widget-wrapper iframe').first()
    await expect(iframe).toHaveAttribute('src', saved[0].url)
  })
})
