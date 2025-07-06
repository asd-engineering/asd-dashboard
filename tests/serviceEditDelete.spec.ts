import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { ensurePanelOpen } from './shared/common'


test.describe('Service Edit/Delete', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('edit service updates list', async ({ page }) => {
    await ensurePanelOpen(page)
    const row = page.locator('#widget-selector-panel .widget-option:has-text("ASD-toolbox")')
    await row.hover()
    await row.locator('button[data-action="edit"]').click()
    const modal = page.locator('#save-service-modal')
    await expect(modal).toBeVisible()
    await page.fill('#service-name', 'Toolbox X')
    await page.fill('#service-url', 'http://localhost/x')
    await page.click('#save-service-modal button:has-text("Save")')
    await expect(modal).toBeHidden()

    const services = await page.evaluate(() => JSON.parse(localStorage.getItem('services')))
    expect(services.some(s => s.name === 'Toolbox X' && s.url === 'http://localhost/x')).toBeTruthy()
    await expect(page.locator('#widget-selector-panel')).toContainText('Toolbox X')
  })

  test('delete service removes widgets', async ({ page }) => {
    await ensurePanelOpen(page)
    const row = page.locator('#widget-selector-panel .widget-option:has-text("ASD-terminal")')
    await row.click()
    await expect(page.locator('.widget-wrapper')).toHaveCount(1)

    page.on('dialog', d => d.accept())
    await row.hover()
    await row.locator('button[data-action="remove"]').click()
    await page.waitForSelector('.widget-wrapper', { state: 'detached' })

    const services = await page.evaluate(() => JSON.parse(localStorage.getItem('services')))
    expect(services.find(s => s.name === 'ASD-terminal')).toBeUndefined()
  })
})
