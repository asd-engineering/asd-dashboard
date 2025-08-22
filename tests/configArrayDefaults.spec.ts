// @ts-check
import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { handleDialog, navigate } from './shared/common'

test.describe('config array defaults', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
    await handleDialog(page, 'confirm')
    await page.click('#reset-button')
  })

  test('boards, views and widgets get full defaults when added', async ({ page }) => {
    await page.click('#open-config-modal')
    // set config to only have empty boards array
    await page.click('#cfgTab .modal__btn--toggle')
    const cfgTextarea = page.locator('#config-json')
    await cfgTextarea.fill(JSON.stringify({ boards: [] }, null, 2))
    await page.click('#cfgTab .modal__btn--toggle')

    // add board, view and widget
    await page.click('#config-form .jf-array > button:has-text("+")')
    await page.click('#config-form label:has-text("views") + .jf-array > button:has-text("+")')
    await page.click('#config-form label:has-text("widgetState") + .jf-array > button:has-text("+")')

    // widget fields rendered immediately
    await expect(page.locator('#config-form label:has-text("url") + input')).toBeVisible()
    await expect(page.locator('#config-form label:has-text("columns") + input')).toBeVisible()
    await expect(page.locator('#config-form label:has-text("rows") + input')).toBeVisible()
    await expect(page.locator('#config-form label:has-text("metadata") + div')).toHaveCount(1)
    await expect(page.locator('#config-form label:has-text("settings") + div')).toHaveCount(1)
  })

  test('services and tags use defaults and duplicate existing entries', async ({ page }) => {
    await page.click('#open-config-modal')
    await page.click('#config-modal .tabs button:has-text("Services")')

    // start with empty services array
    await page.click('#svcTab .modal__btn--toggle')
    const svcTextarea = page.locator('#config-services')
    await svcTextarea.fill('[]')
    await page.click('#svcTab .modal__btn--toggle')

    // add first service
    await page.click('#services-form > div > button:has-text("+")')
    await expect(page.locator('#services-form label:has-text("url") + input')).toBeVisible()
    await expect(page.locator('#services-form label:has-text("config") + div')).toHaveCount(1)

    // tags array default
    await page.click('#services-form label:has-text("tags") + div > button:has-text("+")')
    await expect(page.locator('#services-form label:has-text("tags") + div > div > input')).toBeVisible()

    // adding another service uses defaults, not cloning previous values
    const nameInput = page.locator('#services-form label:has-text("name") + input').first()
    await nameInput.fill('Service One')
    await page.click('#services-form > div > button:has-text("+")')
    const secondName = page.locator('#services-form label:has-text("name") + input').nth(1)
    await expect(secondName).toHaveValue('Unnamed Service')
  })
})
