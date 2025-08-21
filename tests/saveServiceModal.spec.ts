import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking.js'
import { ensurePanelOpen } from './shared/common'

test.describe('Save Service Modal', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await ensurePanelOpen(page)
  })

  test('opens when adding widget with manual URL', async ({ page }) => {
    const trigger = page.locator('[data-testid="service-panel"] [data-testid="panel-actions-trigger"]')
    await trigger.hover()
    await page.locator('.side-content .panel-action', { hasText: 'New Service' }).click()
    const modal = page.locator('#save-service-modal')
    await expect(modal).toBeVisible()
    await expect(modal.locator('input#service-name')).toBeVisible()
  })

  test('saves manual service when confirmed', async ({ page }) => {
    const url = 'http://localhost/manual-save'
    const trigger2 = page.locator('[data-testid="service-panel"] [data-testid="panel-actions-trigger"]')
    await trigger2.hover()
    await page.locator('.side-content .panel-action', { hasText: 'New Service' }).click()
    const modal = page.locator('#save-service-modal')
    await expect(modal).toBeVisible()

    // Fill out the new service details
    await page.fill('#service-name', 'Manual Service')
    await page.fill('#service-url', url)
    
    await page.check('#service-start')

    await page.click('#save-service-modal button:has-text("Save")')
    await expect(modal).toBeHidden()

    // Now the widget should exist
    const iframe = page.locator('.widget-wrapper iframe').first()
    await expect(iframe).toHaveAttribute('src', url)
    
    // Verify it was saved to storage
    const services = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      return sm.getServices()
    })
    expect(services.some(s => s.url === url && s.name === 'Manual Service')).toBeTruthy()
  })

  test('skipping manual service does not store it', async ({ page }) => {
    const url = 'http://localhost/manual-skip'
    const trigger3 = page.locator('[data-testid="service-panel"] [data-testid="panel-actions-trigger"]')
    await trigger3.hover()
    await page.locator('.side-content .panel-action', { hasText: 'New Service' }).click()
    const modal = page.locator('#save-service-modal')
    await expect(modal).toBeVisible()
    await page.fill('#service-url', url) // Fill URL to be certain
    await page.click('#save-service-modal button:has-text("Cancel")')
    await expect(modal).toBeHidden()

    await expect(page.locator('.widget-wrapper')).toHaveCount(0);

    // Verify it was NOT saved to storage
    const services = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      return sm.getServices()
    })
    expect(services.some(s => s.url === url)).toBeFalsy()
  })
})
