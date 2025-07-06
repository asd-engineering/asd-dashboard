import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'


test.describe('Service Edit/Delete', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('edit service updates list', async ({ page }) => {
    await page.click('#widget-selector-panel .widget-option:has-text("ASD-toolbox") button[data-action="edit"]')
    const modal = page.locator('#edit-service-modal')
    await expect(modal).toBeVisible()
    await page.fill('#edit-service-name', 'Toolbox X')
    await page.fill('#edit-service-url', 'http://localhost/x')
    await page.click('#edit-service-modal button:has-text("Save")')
    await expect(modal).toBeHidden()

    const services = await page.evaluate(() => JSON.parse(localStorage.getItem('services')))
    expect(services.some(s => s.name === 'Toolbox X' && s.url === 'http://localhost/x')).toBeTruthy()
    await expect(page.locator('#widget-selector-panel .widget-option')).toContainText('Toolbox X')
  })

  test('delete service removes widgets', async ({ page }) => {
    await page.click('#widget-selector-panel .widget-option:has-text("ASD-terminal")')
    await expect(page.locator('.widget-wrapper')).toHaveCount(1)

    page.on('dialog', d => d.accept())
    await page.click('#widget-selector-panel .widget-option:has-text("ASD-terminal") button[data-action="remove"]')
    await page.waitForSelector('.widget-wrapper', { state: 'detached' })

    const services = await page.evaluate(() => JSON.parse(localStorage.getItem('services')))
    expect(services.find(s => s.name === 'ASD-terminal')).toBeUndefined()
  })
})
