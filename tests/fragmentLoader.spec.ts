import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { gzipJsonToBase64url } from '../src/utils/compression.js'
import { getUnwrappedConfig, getConfigTheme } from './shared/common'
import { setLocalConfig, setLocalServices } from './shared/state.js'

async function encode (obj: any) {
  return gzipJsonToBase64url(obj)
}

test('verify config and services from URL fragment does not load before user decides', async ({ page }) => {
  const cfg = await encode(ciConfig)
  const svc = await encode(ciServices)
  await page.goto(`/#cfg=${cfg}&svc=${svc}`)
  await page.waitForLoadState('domcontentloaded')
  const config = await getUnwrappedConfig(page)
  const services = await page.evaluate(async () => {
    const { default: sm } = await import('/storage/StorageManager.js')
    return sm.getServices()
  })

  // Storage should not have been updated yet
  expect(config.globalSettings).toBe(undefined)
  expect(services.length).toEqual(0)
})

test('fragment data is not reapplied if localStorage already has data', async ({ page }) => {
  const cfg = await encode(ciConfig)

  await page.addInitScript(() => {
    (async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      sm.setConfig({ globalSettings: { theme: 'dark' }, boards: [] })
      sm.setServices([])
    })()
  })

  await page.goto(`/#cfg=${cfg}`)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector('#fragment-decision-modal', { timeout: 5000 })
  const modal = page.locator('#fragment-decision-modal')
  await expect(modal).toBeVisible()
  await modal.locator('button:has-text("Cancel")').click()
  await expect(modal).toBeHidden()

  const theme = await getConfigTheme(page);
  expect(theme).toBe('dark')
})

test('shows merge decision modal when local data exists', async ({ page }) => {
  const cfg = await encode(ciConfig)
  const svc = await encode(ciServices)

  await page.addInitScript(value => {
    (async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      sm.setConfig(value.config)
      sm.setServices(value.services)
    })()
  }, {
    config: { globalSettings: { theme: 'dark' }, boards: [{ id: 'b1', name: 'Board 1', order: 0, views: [] }] },
    services: [{ name: 'Old', url: 'http://localhost/old' }]
  })

  await page.goto(`/#cfg=${cfg}&svc=${svc}`)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector('#fragment-decision-modal', { timeout: 5000 })
  const modal = page.locator('#fragment-decision-modal')
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('What would you like to do?')

  await modal.locator('button:has-text("Cancel")').click()
  await expect(modal).toBeHidden()

  const theme = await getConfigTheme(page);
  expect(theme).toBe('dark')
})
