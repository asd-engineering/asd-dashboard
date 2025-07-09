import { test, expect } from './fixtures'
import emojiList from '../src/ui/unicodeEmoji.js'
import { routeServicesConfig } from './shared/mocking.js'
import { ciConfig } from './data/ciConfig'

const settings = {
  hideBoardControl: true,
  hideViewControl: true,
  hideServiceControl: false,
}

test.describe('Menu control visibility', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.route('**/config.json', route => {
      route.fulfill({
        json: {
          ...ciConfig,
          globalSettings: { ...ciConfig.globalSettings, ...settings },
        },
      })
    })

    await page.goto('/')
    await page.waitForSelector('body[data-ready="true"]')
  })

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear())
  })

  test('applies visibility flags and reset button placement', async ({ page }) => {
    await expect(page.locator('#board-control')).not.toBeVisible()
    await expect(page.locator('#view-control')).not.toBeVisible()
    await expect(page.locator('#service-control')).toBeVisible()
    await expect(page.locator('#admin-control')).toBeVisible()

    const resetButton = page.locator('#admin-control #reset-button')
    await expect(resetButton).toBeVisible()
    await expect(resetButton).toHaveText(`${emojiList.crossCycle.unicode}`)
  })
})

test.describe('Widget menu visibility', () => {
  const custom = { ...settings, showMenuWidget: false }

  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.route('**/config.json', route => {
      route.fulfill({
        json: {
          ...ciConfig,
          globalSettings: { ...ciConfig.globalSettings, ...custom },
        },
      })
    })

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear())
  })

  test('toggling widget menu updates stored config', async ({ page }) => {
    const container = page.locator('#widget-container')
    await expect(container).toHaveClass(/hide-widget-menu/)

    await page.click('#toggle-widget-menu')
    await expect(container).not.toHaveClass(/hide-widget-menu/)

    const stored = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('config') || '{}').globalSettings.showMenuWidget
    })
    expect(stored).toBe(true)
  })
})

test.describe('View button menu visibility', () => {
  const btnSettings = {
    hideBoardControl: true,
    hideViewControl: true,
    hideServiceControl: true,
    views: {
      showViewOptionsAsButtons: true,
      viewToShow: 'view-B'
    }
  }

  const testBoards = [
    {
      id: 'board-btn',
      name: 'Btn Board',
      order: 0,
      views: [
        { id: 'view-A', name: 'View A', widgetState: [] },
        { id: 'view-B', name: 'View B', widgetState: [] }
      ]
    }
  ]

  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.route('**/config.json', route => {
      route.fulfill({ json: { ...ciConfig, boards: testBoards, globalSettings: { ...ciConfig.globalSettings, ...btnSettings } } })
    })

    await page.goto('/')
    await page.waitForSelector('body[data-ready="true"]')
  })

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear())
  })

  test('shows view buttons and hides selectors', async ({ page }) => {
    await expect(page.locator('#board-control')).not.toBeVisible()
    await expect(page.locator('#view-control')).not.toBeVisible()
    await expect(page.locator('#service-control')).not.toBeVisible()
    await expect(page.locator('#view-button-menu')).toBeVisible()
  })

  test('activates configured default view button', async ({ page }) => {
    const active = page.locator('#view-button-menu button.active')
    await expect(active).toHaveAttribute('data-view-id', 'view-B')
  })
})
