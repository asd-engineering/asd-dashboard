// @ts-check
import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { navigate } from './shared/common'

test.describe('config subtabs', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
  })

  test('subtabs render and preserve edits', async ({ page }) => {
    await page.click('#open-config-modal')
    await expect(page.locator('#config-form .jf-subtabs button:has-text("globalSettings")')).toBeVisible()
    await expect(page.locator('#config-form .jf-subtabs button:has-text("boards")')).toBeVisible()
    const themeInput = page.locator('#config-form label:has-text("theme") + input')
    await themeInput.fill('dark')
    await page.click('#config-form .jf-subtabs button:has-text("boards")')
    await expect(themeInput).toBeHidden()
    await page.click('#config-form .jf-subtabs button:has-text("globalSettings")')
    await expect(themeInput).toHaveValue('dark')
  })

  test('add creates empty widget with placeholders', async ({ page }) => {
    await page.click('#open-config-modal')
    await page.click('#config-form .jf-subtabs button:has-text("boards")')
    await page.click('#config-form .jf-array > button:has-text("+")')
    await page.click('#config-form label:has-text("views") + .jf-array > button:has-text("+")')
    await page.click('#config-form label:has-text("widgetState") + .jf-array > button:has-text("+")')
    const firstUrl = page.locator('#config-form label:has-text("url") + input').first()
    await firstUrl.fill('https://one')
    await page.locator('#config-form label:has-text("columns") + input').first().fill('2')
    await page.locator('#config-form label:has-text("rows") + input').first().fill('2')
    await page.click('#config-form label:has-text("widgetState") + .jf-array > button:has-text("+")')
    const secondUrl = page.locator('#config-form label:has-text("url") + input').nth(1)
    await expect(secondUrl).toHaveValue('')
    await expect(secondUrl).toHaveAttribute('placeholder', 'https://…')
    const secondCols = page.locator('#config-form label:has-text("columns") + input').nth(1)
    await expect(secondCols).toHaveValue('1')
    await expect(secondCols).toHaveAttribute('min', '1')
    const secondType = page.locator('#config-form label:has-text("type") + input').nth(1)
    await expect(secondType).toHaveAttribute('placeholder', 'iframe')
  })
})
