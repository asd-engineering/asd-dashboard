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

    const services = await page.evaluate(() => JSON.parse(localStorage.getItem('services') || '[]'))
    expect(services.some(s => s.url === url && s.name === 'Manual Service')).toBeTruthy()

    const options = await page.$$eval('#widget-selector-panel .widget-option', opts => opts.map(o => (o as HTMLElement).dataset.label || o.textContent))
    expect(options).toContain('Manual Service')

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

    const services = await page.evaluate(() => JSON.parse(localStorage.getItem('services') || '[]'))
    expect(services.some(s => s.url === url)).toBeFalsy()

    const options = await page.$$eval('#widget-selector-panel .widget-option', opts => opts.map(o => (o as HTMLElement).dataset.label || o.textContent))
    expect(options).not.toContain('Manual Service')

    const iframe = page.locator('.widget-wrapper iframe').first()
    await expect(iframe).toHaveAttribute('src', url)
  })
})
