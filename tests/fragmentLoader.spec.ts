import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { gzipJsonToBase64url } from '../src/utils/compression.js'

async function encode (obj: any) {
  return gzipJsonToBase64url(obj)
}

test('loads config and services from URL fragment', async ({ page }) => {
  const cfg = await encode(ciConfig)
  const svc = await encode(ciServices)
  await page.goto(`/#cfg=${cfg}&svc=${svc}`)
  await page.waitForLoadState('domcontentloaded')
  const config = await page.evaluate(() => JSON.parse(localStorage.getItem('config') || '{}'))
  const services = await page.evaluate(() => JSON.parse(localStorage.getItem('services') || '[]'))
  expect(config.globalSettings.theme).toBe(ciConfig.globalSettings.theme)
  expect(services.length).toBe(ciServices.length)
})

test('fragment data is not reapplied if localStorage already has data', async ({ page }) => {
  const cfg = await encode(ciConfig)

  await page.addInitScript(() => {
    localStorage.setItem('config', JSON.stringify({ globalSettings: { theme: 'dark' } }))
    localStorage.setItem('services', JSON.stringify([]))
    localStorage.setItem('boards', JSON.stringify([]))
  })

  await page.goto(`/#cfg=${cfg}`)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector('#fragment-decision-modal', { timeout: 5000 })
  const modal = page.locator('#fragment-decision-modal')
  await expect(modal).toBeVisible()
  await modal.locator('button:has-text("Cancel")').click()
  await expect(modal).toBeHidden()

  const theme = await page.evaluate(() => JSON.parse(localStorage.getItem('config') || '{}').globalSettings.theme)
  expect(theme).toBe('dark')
})

test('shows merge decision modal when local data exists', async ({ page }) => {
  const cfg = await encode(ciConfig)
  const svc = await encode(ciServices)

  await page.addInitScript(value => {
    localStorage.setItem('config', JSON.stringify(value.config))
    localStorage.setItem('services', JSON.stringify(value.services))
    localStorage.setItem('boards', JSON.stringify(value.boards))
  }, {
    config: { globalSettings: { theme: 'dark' } },
    services: [{ name: 'Old', url: 'http://localhost/old' }],
    boards: [{ id: 'b1', name: 'Board 1', order: 0, views: [] }]
  })

  await page.goto(`/#cfg=${cfg}&svc=${svc}`)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForSelector('#fragment-decision-modal', { timeout: 5000 })
  const modal = page.locator('#fragment-decision-modal')
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('What would you like to do?')

  await modal.locator('button:has-text("Cancel")').click()
  await expect(modal).toBeHidden()

  const theme = await page.evaluate(() => JSON.parse(localStorage.getItem('config') || '{}').globalSettings.theme)
  expect(theme).toBe('dark')
})
