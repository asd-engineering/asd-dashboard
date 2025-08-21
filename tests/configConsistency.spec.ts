// @ts-check
import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { handleDialog, getUnwrappedConfig, navigate } from './shared/common'

test.describe('config consistency', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page,'/')
    
    await handleDialog(page, 'confirm')
    await page.click('#reset-button')
    
  })

  test('open-config-modal shows boards after reset', async ({ page }) => {
    await page.click('#open-config-modal', { force: true })
    const text = await page.locator('#config-json').inputValue()
    const cfg = JSON.parse(text)
    expect(Array.isArray(cfg.boards)).toBeTruthy()
    expect(cfg.boards.length).toBeGreaterThan(0)
  })

  test('config matches localStorage after save', async ({ page }) => {
    await page.click('#open-config-modal', { force: true })
    await page.waitForSelector('#config-json')
    const cfgText = await page.locator('#config-json').inputValue()
    const cfg = JSON.parse(cfgText)
    await page.click('#config-modal .modal__btn--cancel')
    const stored = await getUnwrappedConfig(page)
    expect(stored.boards).toEqual(cfg.boards)
  })

  test('saving config without boards removes boards storage', async ({ page }) => {
    await page.click('#open-config-modal', { force: true })
    const textarea = page.locator('#config-json')
    await textarea.waitFor()
    const cfg = JSON.parse(await textarea.inputValue())
    delete cfg.boards
    await textarea.fill(JSON.stringify(cfg, null, 2))
    await page.click('#config-modal .modal__btn--save')
    const config = await getUnwrappedConfig(page);
    expect(config.boards).toEqual([])
  })
})
