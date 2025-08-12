import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { ensurePanelOpen } from './shared/common'


test.describe('Service Edit/Delete', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await ensurePanelOpen(page)
  })

  test('edit service updates list', async ({ page }) => {
    const serviceRow = page.locator('#widget-selector-panel .widget-option:has-text("ASD-toolbox")');
    
    // *** FIX: Hover over the row first to make action buttons appear ***
    await serviceRow.hover();
    
    await serviceRow.locator('button[data-action="edit"]').click();

    const modal = page.locator('#save-service-modal') // The modal ID is now save-service-modal
    await expect(modal).toBeVisible()
    await page.fill('#service-name', 'Toolbox X')
    await page.fill('#service-url', 'http://localhost/x')
    await page.click('#save-service-modal button:has-text("Save")')
    await expect(modal).toBeHidden()

    const services = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js');
      return sm.getServices();
    })
    expect(services.some(s => s.name === 'Toolbox X' && s.url === 'http://localhost/x')).toBeTruthy()
    await expect(page.locator('#widget-selector-panel .widget-option').filter({ hasText: 'Toolbox X' })).toHaveCount(1)
  })

  test('delete service removes widgets', async ({ page }) => {
    await page.click('#widget-selector-panel .widget-option:has-text("ASD-terminal")')
    await expect(page.locator('.widget-wrapper')).toHaveCount(1)

    page.on('dialog', d => d.accept())
    await page.click('#widget-selector-panel .widget-option:has-text("ASD-terminal") button[data-action="remove"]')
    await page.waitForSelector('.widget-wrapper', { state: 'detached' })

    const services = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js');
      return sm.getServices();
    })
    expect(services.find(s => s.name === 'ASD-terminal')).toBeUndefined()
  })
})
