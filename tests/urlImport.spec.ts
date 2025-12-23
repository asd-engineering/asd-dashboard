// tests/urlImport.spec.ts
import { test, expect } from './fixtures'
import { ciConfig, ciBoards } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { gzipJsonToBase64url } from '../src/utils/compression.js'
import { openConfigModalSafe } from './shared/uiHelpers'
import { navigate, getUnwrappedConfig, wipeConfigPreserveSnapshots } from './shared/common.js'

test('URL import stores snapshot and remains switchable', async ({ page }) => {
  const cfgEnc = await gzipJsonToBase64url({ ...ciConfig, boards: ciBoards })
  const svcEnc = await gzipJsonToBase64url(ciServices)

  // Navigate first, then set up storage (instead of addInitScript which runs on every nav)
  await page.goto('/')

  // Clear and seed storage manually
  await page.evaluate(async () => {
    localStorage.clear()
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('asd-db')
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
    // Seed with minimal config
    await new Promise<void>((resolve, reject) => {
      const openRequest = indexedDB.open('asd-db', 1)
      openRequest.onupgradeneeded = () => {
        const db = openRequest.result
        for (const name of ['config', 'boards', 'services', 'meta', 'state_store']) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name)
        }
      }
      openRequest.onsuccess = () => {
        const db = openRequest.result
        const tx = db.transaction(['config', 'boards', 'services', 'meta'], 'readwrite')
        tx.objectStore('config').put({ globalSettings: { theme: 'dark' } }, 'v1')
        tx.objectStore('boards').put([], 'v1')
        tx.objectStore('services').put([], 'v1')
        tx.objectStore('meta').put(true, 'migrated')
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = () => { db.close(); reject(tx.error) }
      }
      openRequest.onerror = () => reject(openRequest.error)
    })
  })

  // Navigate with fragment - this triggers the fragment decision modal
  await page.goto(`/#cfg=${cfgEnc}&svc=${svcEnc}`, { waitUntil: 'domcontentloaded' })

  // Decide to switch to the imported environment - wait for reload
  await page.waitForSelector('#fragment-decision-modal', { state: 'visible', timeout: 5000 })
  await Promise.all([
    page.waitForEvent('load'),
    page.click('#fragment-decision-modal button#switch-environment')
  ])

  // Wait for app ready
  await page.waitForFunction(() => document.body.dataset.ready === 'true')

  // Verify snapshot is registered as Imported
  await openConfigModalSafe(page, "stateTab")

  await expect(
    page.locator('#stateTab tbody tr:not(.hc-details-row)').first().locator('td[data-col="type"]')
  ).toHaveText(/imported/i)

  // Wipe persistent state (simulate fresh boot)
  await wipeConfigPreserveSnapshots(page);

  // Reboot SPA
  await navigate(page, '/')

  // Open the state tab again and switch to the Imported snapshot
  await openConfigModalSafe(page, "stateTab")

  // Switch to the imported snapshot - wait for reload
  const switchBtn = page
    .locator('#stateTab tbody tr:not(.hc-details-row):has-text("Imported")')
    .locator('button[data-action="switch"]')
  await Promise.all([
    page.waitForEvent('load'),
    switchBtn.click()
  ])

  // Wait for app ready after reload
  await page.waitForFunction(() => document.body.dataset.ready === 'true')

  const cfg = await getUnwrappedConfig(page);
  expect((cfg.boards || []).length).toBeGreaterThan(0);
})
