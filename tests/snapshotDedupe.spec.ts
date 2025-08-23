import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'

// These tests exercise snapshot logic directly via StorageManager
// to ensure deterministic behavior without UI flakiness.

test('export de-duplicates by md5', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async ({ cfg, svc }) => {
    const { default: sm } = await import('/storage/StorageManager.js')
    await sm.clearStateStore()
    sm.setConfig(cfg)
    sm.setServices(svc)
    const first = await sm.saveStateSnapshot({ name: 'one', type: 'manual', cfg: JSON.stringify(cfg), svc: JSON.stringify(svc) })
    const second = await sm.saveStateSnapshot({ name: 'two', type: 'manual', cfg: JSON.stringify(cfg), svc: JSON.stringify(svc) })
    const store = await sm.loadStateStore()
    return { first, second, count: store.states.length }
  }, { cfg: ciConfig, svc: ciServices })
  expect(result.count).toBe(1)
  expect(result.first).toBe(result.second)
})

test('switch environment flow', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async ({ cfg, svc }) => {
    const { default: sm } = await import('/storage/StorageManager.js')
    const { saveImportedSnapshot } = await import('/storage/snapshots.js')
    sm.clearAll()
    sm.setConfig(cfg)
    sm.setServices(svc)
    await saveImportedSnapshot('snap1', JSON.stringify({ ...cfg, globalSettings: { ...cfg.globalSettings, theme: 'dark' } }), JSON.stringify(svc))
    const store = await sm.loadStateStore()
    const theme = JSON.parse(store.states[0].cfg).globalSettings.theme
    return { count: store.states.length, theme }
  }, { cfg: ciConfig, svc: ciServices })
  expect(result.count).toBe(1)
  expect(result.theme).toBe('dark')
})
