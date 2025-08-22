import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { ensurePanelOpen } from './shared/panels'


test.describe('Service Edit/Delete', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await ensurePanelOpen(page, 'service-panel')
  })

  test('edit service updates list', async ({ page }) => {
    const serviceRow = page.locator('[data-testid="service-panel"] .panel-item:has-text("ASD-toolbox")');
    
    // *** FIX: Hover over the row first to make action buttons appear ***
    await serviceRow.hover();
    
    await serviceRow.locator('[data-item-action="rename"]').click();

    const modal = page.locator('#save-service-modal') // The modal ID is now save-service-modal
    await expect(modal).toBeVisible()
    await page.fill('#service-name', 'Toolbox X')
    await page.fill('#service-url', 'http://localhost/x')
    await page.click('#save-service-modal button:has-text("Save")')
    await expect(modal).toBeHidden()

    const services = await page.evaluate(() => JSON.parse(localStorage.getItem('services')))
    expect(services.some(s => s.name === 'Toolbox X' && s.url === 'http://localhost/x')).toBeTruthy()
    await expect(page.locator('[data-testid="service-panel"] .panel-item').filter({ hasText: 'Toolbox X' })).toHaveCount(1)
  })

  test('delete service removes widgets', async ({ page }) => {
    const terminalRow = page.locator('[data-testid="service-panel"] .panel-item:has-text("ASD-terminal")')

    // Open the service to render its widget
    await terminalRow.click()
    await expect(page.locator('.widget-wrapper')).toHaveCount(1)

    page.on('dialog', d => d.accept())

    // Reveal action buttons before attempting to delete
    await terminalRow.hover()
    await terminalRow.locator('[data-item-action="delete"]').click()
    await page.waitForSelector('.widget-wrapper', { state: 'detached' })

    const services = await page.evaluate(() => JSON.parse(localStorage.getItem('services')))
    expect(services.find(s => s.name === 'ASD-terminal')).toBeUndefined()
  })
})
