import { test, expect } from './fixtures'
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

  test('saves manual service when confirmed', async ({ page }) => {
    const url = 'http://localhost/manual-save'
    await page.fill('#widget-url', url)
    await page.click('#add-widget-button')
    const modal = page.locator('#save-service-modal')
    await expect(modal).toBeVisible()
    await page.fill('#save-service-name', 'Manual Service')
    await page.click('#save-service-modal button:has-text("Save & Close")')
    await expect(modal).toBeHidden()

    const services = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js');
      return sm.getServices();
    })
    expect(services.some(s => s.url === url && s.name === 'Manual Service')).toBeTruthy()

    const options = await page.$$eval('#service-selector option', opts => opts.map(o => o.textContent))
    expect(options).toContain('Manual Service')

    const iframe = page.locator('.widget-wrapper iframe').first()
    await expect(iframe).toHaveAttribute('src', url)
  })

  test('skipping manual service does not store it', async ({ page }) => {
    const url = 'http://localhost/manual-skip'
    await page.fill('#widget-url', url)
    await page.click('#add-widget-button')
    const modal = page.locator('#save-service-modal')
    await expect(modal).toBeVisible()
    await page.click('#save-service-modal button:has-text("Skip")')
    await expect(modal).toBeHidden()

    const services = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js');
      return sm.getServices();
    })
    expect(services.some(s => s.url === url)).toBeFalsy()

    const options = await page.$$eval('#service-selector option', opts => opts.map(o => o.textContent))
    expect(options).not.toContain('Manual Service')

    const iframe = page.locator('.widget-wrapper iframe').first()
    await expect(iframe).toHaveAttribute('src', url)
  })
})
