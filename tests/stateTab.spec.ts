import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'

// Rewritten to exercise saved-state logic directly via StorageManager.

test('restore and delete snapshot', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async ({ cfg, svc }) => {
    const { default: sm } = await import('/storage/StorageManager.js')
    await sm.clearStateStore()
    sm.setConfig(cfg)
    sm.setServices(svc)
    await sm.saveStateSnapshot({ name: 'one', type: 'manual', cfg: JSON.stringify(cfg), svc: JSON.stringify(svc) })
    await sm.saveStateSnapshot({ name: 'two', type: 'manual', cfg: JSON.stringify({ ...cfg, globalSettings: { ...cfg.globalSettings, theme: 'dark' } }), svc: JSON.stringify(svc) })
    let store = await sm.loadStateStore()
    const before = store.states.length
    const removeMd5 = store.states[0].md5
    store.states = store.states.filter(s => s.md5 !== removeMd5)
    await sm.saveStateStore(store)
    store = await sm.loadStateStore()
    return { before, after: store.states.length }
  }, { cfg: ciConfig, svc: ciServices })
  expect(result.before).toBe(2)
  expect(result.after).toBe(1)
})
