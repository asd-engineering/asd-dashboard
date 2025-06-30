import { test, expect } from '@playwright/test'
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
  await page.goto(`/#cfg=${cfg}`)
  await page.waitForLoadState('domcontentloaded')

  await page.evaluate(() => {
    localStorage.setItem('config', JSON.stringify({ globalSettings: { theme: 'dark' } }))
    localStorage.setItem('services', JSON.stringify([]))
    localStorage.setItem('boards', JSON.stringify([]))
  })

  await page.goto(`/#cfg=${cfg}`)
  const theme = await page.evaluate(() => JSON.parse(localStorage.getItem('config') || '{}').globalSettings.theme)
  expect(theme).toBe('dark')
})
