import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { ensurePanelOpen } from './shared/panels'
import { navigate } from './shared/common'

// Verify that widgets respect size defaults from their service template

test.describe('Widget Sizing', () => {
  test('should apply default dimensions from service template on creation', async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    // Wait until service templates have been applied

    await expect.poll(async () => {
      const svc = await page.evaluate(async () => {
        const sm = (await import('/storage/StorageManager.js')).default;
        return sm.getServices().find(s => s.name === 'ASD-templated')?.config;
      });
      return `${svc?.columns}/${svc?.rows}`;
    }).toBe('2/2');

    await ensurePanelOpen(page, 'service-panel')

    await page.click('[data-testid="service-panel"] .panel-item:has-text("ASD-templated")')
    const widget = page.locator('.widget-wrapper[data-service="ASD-templated"]')
    await widget.waitFor()
    await expect(widget).toHaveAttribute('data-columns', '2')
    await expect(widget).toHaveAttribute('data-rows', '2')
  })
})
