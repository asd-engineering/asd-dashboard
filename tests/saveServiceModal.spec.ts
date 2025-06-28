import { test, expect } from '@playwright/test'
import { routeServicesConfig } from './shared/mocking.js'


test.describe('Save Service Modal', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('opens when adding widget with manual URL', async ({ page }) => {
    await page.fill('#widget-url', 'http://localhost/manual')
    await page.click('#add-widget-button')
    const modal = page.locator('#save-service-modal')
    await expect(modal).toBeVisible()
    await expect(modal.locator('input#save-service-name')).toBeVisible()
  })
})
