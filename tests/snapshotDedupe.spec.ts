import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { bootWithDashboardState } from './shared/bootState.js'
import { navigate, clearStorage } from './shared/common.js'
import { injectSnapshot } from './shared/state.js'

 test('export de-duplicates by md5', async ({ page }) => {
  await clearStorage(page)
  await navigate(page, '/')
  await page.evaluate(async ({ cfg, svc }) => {
    const { StorageManager: sm } = await import('/storage/StorageManager.js')
    sm.setConfig(cfg)
    sm.setServices(svc)
  }, { cfg: ciConfig, svc: ciServices })
  await page.evaluate(() => import('/component/modal/configModal.js').then(m => m.openConfigModal()))
  await page.waitForSelector('#config-modal .modal__btn--export')
  await page.evaluate(() => { (window as any).__copied=''; navigator.clipboard.writeText = async t => { (window as any).__copied = t } })
  page.on('dialog', d => d.accept())
  await page.click('#config-modal .modal__btn--export')
  const first = await page.evaluate(async () => {
    const { StorageManager: sm } = await import('/storage/StorageManager.js')
    const store = await sm.loadStateStore()
    return store.states[0]
  })
  await page.click('.tabs button[data-tab="stateTab"]')
  await expect(page.locator('#stateTab tbody tr')).toHaveCount(1)
  await expect(page.locator('#stateTab tbody tr td:last-child')).toHaveText(first.md5)
  await page.click('.tabs button[data-tab="cfgTab"]')
  await page.click('#config-modal .modal__btn--export')
  const second = await page.evaluate(async () => {
    const { StorageManager: sm } = await import('/storage/StorageManager.js')
    const store = await sm.loadStateStore()
    return store.states[0]
  })
  await page.click('.tabs button[data-tab="stateTab"]')
  await expect(page.locator('#stateTab tbody tr')).toHaveCount(1)
  expect(second.md5).toBe(first.md5)
  expect(second.ts).toBeGreaterThan(first.ts)
 })

 test('switch environment flow', async ({ page }) => {
  await clearStorage(page)
  await navigate(page, '/')
  await page.evaluate(async ({ cfg, svc }) => {
    const { StorageManager: sm } = await import('/storage/StorageManager.js')
    sm.setConfig(cfg)
    sm.setServices(svc)
  }, { cfg: ciConfig, svc: ciServices })
  const snapCfg = { ...ciConfig, globalSettings: { ...ciConfig.globalSettings, theme: 'dark' } }
  await injectSnapshot(page, snapCfg, ciServices, 'snap1')
  await page.evaluate(() => import('/component/modal/configModal.js').then(m => m.openConfigModal()))
  await page.click('.tabs button[data-tab="stateTab"]')
  await page.locator('#stateTab tbody tr:first-child button[data-action="switch"]').click()
  await expect(page.locator('#switch-environment')).toHaveText(/Switch environment/)
  await Promise.all([
    page.waitForNavigation(),
    page.click('#switch-environment')
  ])
  await page.waitForFunction(() => document.body.dataset.ready === 'true')
  const count = await page.evaluate(async () => {
    const { StorageManager: sm } = await import('/storage/StorageManager.js')
    return (await sm.loadStateStore()).states.length
  })
  const theme = await page.evaluate(async () => {
    const { StorageManager: sm } = await import('/storage/StorageManager.js')
    return sm.getConfig().globalSettings.theme
  })
  expect(count).toBe(1)
  expect(theme).toBe('dark')
 })

 test('no restore wording remains', async ({ page }) => {
  await clearStorage(page)
  await navigate(page, '/')
  await injectSnapshot(page, ciConfig, ciServices, 'snap')
  await page.evaluate(() => import('/component/modal/configModal.js').then(m => m.openConfigModal()))
  await page.click('.tabs button[data-tab="stateTab"]')
  await expect(page.locator('text=Restore')).toHaveCount(0)
  await page.locator('#stateTab tbody tr:first-child button[data-action="switch"]').click()
  await expect(page.locator('text=Overwrite existing data')).toHaveCount(0)
  await page.click('#cancel-environment')
 })
