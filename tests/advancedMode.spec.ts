// @ts-check
import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { navigate } from './shared/common'
import { openConfigModalSafe } from './shared/uiHelpers'

test.describe('advanced mode toggle', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
  })

  test('toggles tabs and subtabs', async ({ page }) => {
    await openConfigModalSafe(page)

    const tabs = page.locator('#config-modal .tabs button')
    await expect(tabs).toHaveText(['Configuration', 'Snapshots & Share'])

    await page.locator('#config-modal button[data-tab="cfgTab"]').click()
    let subtabs = page.locator('#config-form .jf-subtabs button')
    await expect(subtabs).toHaveText(['globalSettings', 'serviceTemplates'])

    await page.locator('[data-testid="advanced-mode-toggle"]').check()
    await page.locator('#config-modal').waitFor({ state: 'visible' })

    const tabsAdv = page.locator('#config-modal .tabs button')
    await expect(tabsAdv).toHaveText(['Configuration', 'Services', 'Snapshots & Share'])

    await page.locator('#config-modal button[data-tab="cfgTab"]').click()
    subtabs = page.locator('#config-form .jf-subtabs button')
    await expect(subtabs).toHaveText(['globalSettings', 'boards', 'serviceTemplates', 'styling'])

    await page.locator('[data-testid="advanced-mode-toggle"]').uncheck()
    await page.locator('#config-modal').waitFor({ state: 'visible' })

    const tabsBack = page.locator('#config-modal .tabs button')
    await expect(tabsBack).toHaveText(['Configuration', 'Snapshots & Share'])

    await page.locator('#config-modal button[data-tab="cfgTab"]').click()
    subtabs = page.locator('#config-form .jf-subtabs button')
    await expect(subtabs).toHaveText(['globalSettings', 'serviceTemplates'])
  })
})

