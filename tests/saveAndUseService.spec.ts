import { test, expect } from '@playwright/test'
import { routeServicesConfig } from './shared/mocking.js'

const saved = [{ name: 'Saved Service', url: 'http://localhost/saved' }]

test.describe('Use saved service', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(value => {
      localStorage.setItem('services', value)
    }, JSON.stringify(saved))
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('selects saved service and adds widget', async ({ page }) => {
    await page.selectOption('#service-selector', { label: saved[0].name })
    await page.click('#add-widget-button')
    const iframe = page.locator('.widget-wrapper iframe').first()
    await expect(iframe).toHaveAttribute('src', saved[0].url)
  })
})
