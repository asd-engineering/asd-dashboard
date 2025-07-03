import { test, expect } from '@playwright/test'
import emojiList from '../src/ui/unicodeEmoji.js'
import { routeServicesConfig } from './shared/mocking.js'
import { ciConfig } from './data/ciConfig'

const settings = {
  hideBoardControl: true,
  hideViewControl: true,
  hideServiceControl: false
}

test.describe('Menu control visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(value => {
      // @ts-ignore
      window.asd = window.asd || {}
      // @ts-ignore
      window.asd.config = { globalSettings: value }
    }, settings)

    await routeServicesConfig(page)
    await page.route('**/config.json', route => {
      route.fulfill({ json: { ...ciConfig, globalSettings: { ...ciConfig.globalSettings, ...settings } } })
    })

    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
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
  test.beforeEach(async ({ page }) => {
    const custom = { ...settings, showMenuWidget: false }
    await page.addInitScript(value => {
      // @ts-ignore
      window.asd = window.asd || {}
      // @ts-ignore
      window.asd.config = { globalSettings: value }
    }, custom)

    await routeServicesConfig(page)
    await page.route('**/config.json', route => {
      route.fulfill({ json: { ...ciConfig, globalSettings: { ...ciConfig.globalSettings, ...custom } } })
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