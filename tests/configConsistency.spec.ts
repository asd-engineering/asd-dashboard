// @ts-check
import { test, expect } from '@playwright/test'
import { routeServicesConfig } from './shared/mocking'
import { handleDialog } from './shared/common'

test.describe('config consistency', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await handleDialog(page, 'confirm')
    await page.click('#reset-button')
    await page.waitForLoadState('domcontentloaded')
  })

  test('open-config-modal shows boards after reset', async ({ page }) => {
    await page.click('#open-config-modal')
    const text = await page.locator('#config-json').inputValue()
    const cfg = JSON.parse(text)
    expect(Array.isArray(cfg.boards)).toBeTruthy()
    expect(cfg.boards.length).toBeGreaterThan(0)
  })

  test('localStorage edit modal reflects same boards', async ({ page }) => {
    await page.click('#localStorage-edit-button')
    const boardText = await page.locator('textarea#localStorage-boards').inputValue()
    const boards = JSON.parse(boardText)
    expect(Array.isArray(boards)).toBeTruthy()
    expect(boards.length).toBeGreaterThan(0)
  })

  test('config matches between modals', async ({ page }) => {
    await page.click('#open-config-modal')
    const cfgText = await page.locator('#config-json').inputValue()
    const cfg = JSON.parse(cfgText)
    await page.click('#config-modal .modal__btn--cancel')

    await page.click('#localStorage-edit-button')
    const boardText = await page.locator('textarea#localStorage-boards').inputValue()
    const boards = JSON.parse(boardText)

    expect(cfg.boards).toEqual(boards)
  })

  test('saving config without boards removes boards storage', async ({ page }) => {
    await page.click('#open-config-modal')
    const textarea = page.locator('#config-json')
    const cfg = JSON.parse(await textarea.inputValue())
    delete cfg.boards
    await textarea.fill(JSON.stringify(cfg, null, 2))
    await page.click('#config-modal .modal__btn--save')
    await page.waitForLoadState('domcontentloaded')
    const boards = await page.evaluate(() => localStorage.getItem('boards'))
    expect(boards).toBeNull()
  })
})
