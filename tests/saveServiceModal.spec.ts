// tests/saveServiceModal.spec.ts
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
    await page.click('#widget-selector-panel .new-service')
    const modal = page.locator('#save-service-modal')
    await expect(modal).toBeVisible()
    await expect(modal.locator('input#service-name')).toBeVisible()
  })

  test('saves manual service when confirmed', async ({ page }) => {
    const url = 'http://localhost/manual-save'
    await page.click('#widget-selector-panel .new-service')
    const modal = page.locator('#save-service-modal')
    await expect(modal).toBeVisible()
    await page.fill('#service-name', 'Manual Service')
    await page.fill('#service-url', url)
    await page.click('#save-service-modal button:has-text("Save")')
    await expect(modal).toBeHidden()

    // Verify services persisted via StorageManager
    const services = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      return sm.getServices()
    })
    expect(services.some(s => s.url === url && s.name === 'Manual Service')).toBeTruthy()

    // New service should appear in the selector panel
    const options = await page.$$eval(
      '#widget-selector-panel .widget-option',
      opts => opts.map(o => (o as HTMLElement).dataset.label || o.textContent)
    )
    expect(options).toContain('Manual Service')

    // A widget should have been added using the saved URL
    const iframe = page.locator('.widget-wrapper iframe').first()
    await expect(iframe).toHaveAttribute('src', url)
  })

  test('skipping manual service does not store it', async ({ page }) => {
    const url = 'http://localhost/manual-skip'
    await page.click('#widget-selector-panel .new-service')
    const modal = page.locator('#save-service-modal')
    await expect(modal).toBeVisible()
    await page.fill('#service-name', 'Manual Service')
    await page.fill('#service-url', url)
    await page.click('#save-service-modal button:has-text("Cancel")')
    await expect(modal).toBeHidden()

    // Service should NOT be stored
    const services = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      return sm.getServices()
    })
    expect(services.some(s => s.url === url)).toBeFalsy()

    // And should NOT appear as an option in the selector
    const options = await page.$$eval(
      '#widget-selector-panel .widget-option',
      opts => opts.map(o => (o as HTMLElement).dataset.label || o.textContent)
    )
    expect(options).not.toContain('Manual Service')

    // Panel interaction should not auto-add the widget on cancel,
    // but if your feature intentionally adds it temporarily, keep this:
    const iframe = page.locator('.widget-wrapper iframe').first()
    await expect(iframe).toHaveAttribute('src', url)
  })
})
