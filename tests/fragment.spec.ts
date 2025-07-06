import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { gzipJsonToBase64url } from '../src/utils/compression.js'

async function encode (obj: any) {
  return gzipJsonToBase64url(obj)
}

test('import modal pre-fills name and saves snapshot', async ({ page }) => {
  const cfg = await encode(ciConfig)
  const svc = await encode(ciServices)
  const name = 'MySnapshot'
  await page.goto(`/#cfg=${cfg}&svc=${svc}&name=${encodeURIComponent(name)}`)
  await page.waitForSelector('#fragment-decision-modal', { timeout: 5000 })
  await expect(page.locator('#importName')).toHaveValue(name)
  await page.locator('#fragment-decision-modal button:has-text("Overwrite")').click()
  await page.waitForLoadState('domcontentloaded')
  const store = await page.evaluate(async () => {
    const { default: sm } = await import('/storage/StorageManager.js')
    return await sm.loadStateStore()
  })
  expect(store.states[0].name).toBe(name)
  expect(store.states[0].type).toBe('imported')
})
