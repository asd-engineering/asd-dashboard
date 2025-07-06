import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { gzipJsonToBase64url } from '../src/utils/compression.js'

async function encode(obj: any) {
  return gzipJsonToBase64url(obj)
}

test.describe('Saved States tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    const cfg = await encode(ciConfig)
    const svc = await encode(ciServices)
    await page.evaluate(async ({ cfg, svc }) => {
      const { default: sm } = await import('/storage/StorageManager.js')
      await sm.saveStateSnapshot({ name: 'one', type: 'imported', cfg, svc })
      await sm.saveStateSnapshot({ name: 'two', type: 'imported', cfg, svc })
    }, { cfg, svc })
  })

  test('restore and delete snapshot', async ({ page }) => {
    await page.click('#open-config-modal')
    await page.click('.tabs button[data-tab="state"]')
    await expect(page.locator('#stateTab tbody tr')).toHaveCount(2)

    await page.locator('#stateTab tbody tr:first-child button:has-text("Restore")').click()
    await page.click('#fragment-decision-modal button:has-text("Overwrite")')
    await page.waitForLoadState('domcontentloaded')
    const boards = await page.evaluate(() => JSON.parse(localStorage.getItem('boards')||'[]'))
    expect(boards.length).toBeGreaterThan(0)

    await page.click('#open-config-modal')
    await page.click('.tabs button[data-tab="state"]')
    page.on('dialog', d => d.accept())
    await page.locator('#stateTab tbody tr:nth-child(2) button:has-text("Delete")').click()
    await expect(page.locator('#stateTab tbody tr')).toHaveCount(1)

    await page.reload()
    await page.click('#open-config-modal')
    await page.click('.tabs button[data-tab="state"]')
    await expect(page.locator('#stateTab tbody tr')).toHaveCount(1)
  })
})
