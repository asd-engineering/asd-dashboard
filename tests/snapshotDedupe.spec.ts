import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { navigate, clearStorage, waitForAppReady, evaluateSafe } from './shared/common.js'
import { injectSnapshot } from './shared/state.js'
import { openConfigModalSafe } from './shared/uiHelpers'

test('export de-duplicates by md5', async ({ page }) => {
  await clearStorage(page)

  await evaluateSafe(page, async ({ cfg, svc }) => {
    const { StorageManager: sm } = await import('/storage/StorageManager.js')
    sm.setConfig(cfg)
    sm.setServices(svc)
    const encodedCfg = JSON.stringify(cfg)
    const encodedSvc = JSON.stringify(svc)
    await sm.saveStateSnapshot({ name: 'first', type: 'export', cfg: encodedCfg, svc: encodedSvc })
    await sm.saveStateSnapshot({ name: 'second', type: 'export', cfg: encodedCfg, svc: encodedSvc })
  }, { cfg: ciConfig, svc: ciServices })

  const snapshots = await evaluateSafe(page, async () => {
    const { StorageManager: sm } = await import('/storage/StorageManager.js')
    const store = await sm.loadStateStore()
    return store.states
  })

  expect(snapshots).toHaveLength(1)
})

test('switch environment flow', async ({ page }) => {
  await clearStorage(page)
  await navigate(page, '/')
  await page.evaluate(async ({ cfg, svc }) => {
    const { StorageManager: sm } = await import('/storage/StorageManager.js')
    sm.setConfig(cfg)
    sm.setServices(svc)
    await sm.flush()
  }, { cfg: ciConfig, svc: ciServices })

  const snapCfg = { ...ciConfig, globalSettings: { ...ciConfig.globalSettings, theme: 'dark' } }
  await injectSnapshot(page, snapCfg, ciServices, 'snap1')

  await openConfigModalSafe(page, "stateTab")

  // Click switch - wait for navigation caused by the switch action
  const snap1Row = page.locator('#stateTab tbody tr:has-text("snap1")')
  await Promise.all([
    page.waitForEvent('load'),
    snap1Row.locator('button[data-action="switch"]').click()
  ])

  await waitForAppReady(page)
  await page.waitForSelector('[data-testid="board-panel"]')

  const result = await evaluateSafe(page, async () => {
    const { StorageManager: sm } = await import('/storage/StorageManager.js')
    return {
      count: (await sm.loadStateStore()).states.length,
      theme: sm.getConfig().globalSettings.theme
    }
  })

  expect(result.count).toBe(2)
  expect(result.theme).toBe('dark')
})

test('no restore wording remains', async ({ page }) => {
  await clearStorage(page)
  await navigate(page, '/')
  await injectSnapshot(page, ciConfig, ciServices, 'snap')
  await page.evaluate(() => import('/component/modal/configModal.js').then(m => m.openConfigModal()))
  await page.waitForSelector('dialog.user-notification', { state: 'detached' }).catch(() => {})
  await page.click('.tabs button[data-tab="stateTab"]')
  // Verify "Restore" wording is not used in the UI
  await expect(page.locator('text=Restore')).toHaveCount(0)
  // Verify switch button uses "Switch" not "Restore"
  await expect(page.locator('#stateTab tbody tr button[data-action="switch"]')).toContainText('Switch')
})
