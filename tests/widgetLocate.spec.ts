import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { navigate, ensurePanelOpen } from './shared/common'

// tests/widgetLocate.spec.ts

test.describe('Locate widget action', () => {
  test.beforeEach(async ({ page }) => {
    const boards = [
      { id: 'b1', name: 'B1', order: 0, views: [{ id: 'v1', name: 'V1', widgetState: [] }] },
      {
        id: 'b2',
        name: 'B2',
        order: 1,
        views: [
          {
            id: 'v2',
            name: 'V2',
            widgetState: [
              {
                order: '0',
                url: 'http://localhost:8000/asd/toolbox',
                type: 'ASD-toolbox',
                dataid: 'W1'
              }
            ]
          }
        ]
      }
    ]

    await page.route('**/services.json', route => route.fulfill({ json: ciServices }))
    await page.route('**/config.json', route => {
      const cfg = {
        ...ciConfig,
        boards,
        globalSettings: {
          ...ciConfig.globalSettings,
          localStorage: {
            ...ciConfig.globalSettings?.localStorage,
            defaultBoard: 'b1',
            defaultView: 'v1'
          }
        }
      }
      route.fulfill({ json: cfg })
    })

    await page.route('**/asd/toolbox', route => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ name: 'ASD-toolbox' })
      })
    })
    await page.route('**/asd/terminal', route => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ name: 'ASD-terminal' })
      })
    })

    await navigate(page, '/')
    await page.waitForSelector('#widget-selector-panel')
  })

  test('navigates to unloaded widget', async ({ page }) => {
    await expect(page.locator('.widget-wrapper')).toHaveCount(0)
    const storeSize = await page.evaluate(() => window.asd.widgetStore.widgets.size)
    expect(storeSize).toBe(0)

    await ensurePanelOpen(page)
    const row = page.locator('#widget-selector-panel .widget-option:has-text("ASD-toolbox")')
    await row.hover()
    await row.locator('button[aria-label="Locate widget"]').click()

    await page.locator('.widget-wrapper').first().waitFor()
    await expect(page.locator('.board')).toHaveAttribute('id', 'b2')
    await expect(page.locator('.board-view')).toHaveAttribute('id', 'v2')
    await expect(page.locator('dialog.user-notification')).toContainText("Mapped to view containing 'ASD-toolbox' widget.")
  })

  test('shows error when widget not found', async ({ page }) => {
    await ensurePanelOpen(page)
    const row = page.locator('#widget-selector-panel .widget-option:has-text("ASD-terminal")')
    await row.hover()
    await row.locator('button[aria-label="Locate widget"]').click()

    await expect(page.locator('.board')).toHaveAttribute('id', 'b1')
    await expect(page.locator('dialog.user-notification')).toContainText("Could not find a 'ASD-terminal' widget in any view.")
  })
})
