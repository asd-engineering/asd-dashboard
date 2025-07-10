import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking.js'
import { selectServiceByName } from './shared/common.js'

const saved = [{ name: 'Saved Service', url: 'http://localhost/saved' }]

test.describe('Use saved service', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(value => {
      (async () => {
        const { default: sm } = await import('/storage/StorageManager.js');
        sm.setServices(JSON.parse(value));
      })();
    }, JSON.stringify(saved))
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('selects saved service and adds widget', async ({ page }) => {
    await selectServiceByName(page, saved[0].name);
    const iframe = page.locator('.widget-wrapper iframe').first()
    await expect(iframe).toHaveAttribute('src', saved[0].url)
  })
})
