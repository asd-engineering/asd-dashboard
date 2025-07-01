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
    await expect(resetButton).toHaveText(`${emojiList.crossCycle.unicode} Reset`)
  })
})