import { test, expect } from '@playwright/test'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { gzipSync } from 'zlib'

function encode(obj: any) {
  const json = JSON.stringify(obj)
  const compressed = gzipSync(Buffer.from(json))
  return compressed.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

test('loads config and services from URL fragment', async ({ page }) => {
  const cfg = encode(ciConfig)
  const svc = encode(ciServices)
  await page.goto(`/#cfg=${cfg}&svc=${svc}`)
  await page.waitForLoadState('domcontentloaded')
  const config = await page.evaluate(() => JSON.parse(localStorage.getItem('config') || '{}'))
  const services = await page.evaluate(() => JSON.parse(localStorage.getItem('services') || '[]'))
  expect(config.globalSettings.theme).toBe(ciConfig.globalSettings.theme)
  expect(services.length).toBe(ciServices.length)
})
