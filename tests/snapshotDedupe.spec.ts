import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { navigate, clearStorage, waitForAppReady, evaluateSafe  } from './shared/common.js'
import { injectSnapshot } from './shared/state.js'
import { openConfigModalSafe } from './shared/uiHelpers'

test('export de-duplicates by md5', async ({ page }) => {
  await clearStorage(page)

  await evaluateSafe(page, async ({ cfg, svc }) => {
    const { default: sm } = await import('/storage/StorageManager.js')
    sm.setConfig(cfg)
    sm.setServices(svc)
    const encodedCfg = JSON.stringify(cfg)
    const encodedSvc = JSON.stringify(svc)
    await sm.saveStateSnapshot({ name: 'first', type: 'export', cfg: encodedCfg, svc: encodedSvc })
    await sm.saveStateSnapshot({ name: 'second', type: 'export', cfg: encodedCfg, svc: encodedSvc })
  }, { cfg: ciConfig, svc: ciServices })

  const snapshots = await evaluateSafe(page, async () => {
    const { default: sm } = await import('/storage/StorageManager.js')
    const store = await sm.loadStateStore()
    return store.states
  })

  expect(snapshots).toHaveLength(1)
})

test('switch environment flow', async ({ page }) => {
  await clearStorage(page)
  await navigate(page, '/')
  await page.evaluate(async ({ cfg, svc }) => {
    const { default: sm } = await import('/storage/StorageManager.js')
    sm.setConfig(cfg)
    sm.setServices(svc)
  }, { cfg: ciConfig, svc: ciServices })
  const snapCfg = { ...ciConfig, globalSettings: { ...ciConfig.globalSettings, theme: 'dark' } }
  await injectSnapshot(page, snapCfg, ciServices, 'snap1')

  await openConfigModalSafe(page, "stateTab")

  await page.locator('#stateTab tbody tr:first-child button[data-action="switch"]').click()

  await waitForAppReady(page)

  await page.waitForSelector('[data-testid="board-panel"]')

  const count = await page.evaluate(async () => {
    const { default: sm } = await import('/storage/StorageManager.js')
    return (await sm.loadStateStore()).states.length
  })

  const theme = await page.evaluate(async () => {
    const { default: sm } = await import('/storage/StorageManager.js')
    return sm.getConfig().globalSettings.theme
  })
  expect(count).toBe(2)
  expect(theme).toBe('dark')
})
