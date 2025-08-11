import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { navigate } from './shared/common'
import crypto from 'crypto'

test.describe('StorageManager', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page,'/')
  })

  test('setConfig stores config only', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      localStorage.clear()
      const cfg = { boards: [{ id: 'b1', name: 'B1', views: [] }] }
      sm.setConfig(cfg)
      return {
        raw: localStorage.getItem('config'),
        boards: localStorage.getItem('boards'),
        cfg: sm.getConfig()
      }
    })
    expect(JSON.parse(result.raw)).toMatchObject({
      version: 1,
      data: {
        boards: [{ id: 'b1', name: 'B1', views: [] }]
      }
    })
    expect(result.boards).toBeNull()

    expect(result.cfg.boards).toEqual([{ id: 'b1', name: 'B1', views: [] }])
    expect(result.cfg.globalSettings).toBeDefined()
    expect(result.cfg.styling).toBeDefined()
  })

  test('saveStateSnapshot persists and hashes', async ({ page }) => {
    const { hash, store } = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      localStorage.clear()
      const hash = await sm.saveStateSnapshot({ name: 'one', type: 'manual', cfg: 'a', svc: 'b' })
      const store = await sm.loadStateStore()
      return { hash, store }
    })
    const expected = crypto.createHash('md5').update('ab').digest('hex')
    expect(hash).toBe(expected)
    expect(store.states[0].md5).toBe(expected)
  })

  test('upsertSnapshotByMd5 adds a new snapshot when md5 not present', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { upsertSnapshotByMd5 } = await import('/storage/StorageManager.js')
      const store = { version: 1, states: [] }
      const { store: s, md5, updated } = upsertSnapshotByMd5(store, { name: 'n1', type: 'manual', cfg: 'a', svc: 'b' })
      return { len: s.states.length, md5, updated }
    })
    const expected = crypto.createHash('md5').update('ab').digest('hex')
    expect(result.updated).toBe(false)
    expect(result.len).toBe(1)
    expect(result.md5).toBe(expected)
  })

  test('upsertSnapshotByMd5 dedupes by md5 and moves to front', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { upsertSnapshotByMd5 } = await import('/storage/StorageManager.js')
      const store = { version: 1, states: [] }
      const orig = Date.now
      let t = 1
      Date.now = () => t++
      upsertSnapshotByMd5(store, { name: 'first', type: 't', cfg: 'a', svc: 'b' })
      upsertSnapshotByMd5(store, { name: 'second', type: 't', cfg: 'c', svc: 'd' })
      const beforeTs = store.states[1].ts
      const { store: s, updated } = upsertSnapshotByMd5(store, { name: 'first', type: 't', cfg: 'a', svc: 'b' })
      Date.now = orig
      return {
        len: s.states.length,
        firstIndex: s.states.findIndex(r => r.name === 'first'),
        ts: s.states[0].ts,
        beforeTs,
        updated
      }
    })
    expect(result.len).toBe(2)
    expect(result.updated).toBe(true)
    expect(result.firstIndex).toBe(0)
    expect(result.ts).toBeGreaterThan(result.beforeTs)
  })

  test('saveStateSnapshot updates name on duplicate md5 and keeps md5 stable', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      const orig = Date.now
      let t = 1
      Date.now = () => t++
      const firstMd5 = await sm.saveStateSnapshot({ name: 'one', type: 'manual', cfg: 'a', svc: 'b' })
      const firstStore = await sm.loadStateStore()
      const firstTs = firstStore.states[0].ts
      const secondMd5 = await sm.saveStateSnapshot({ name: 'two', type: 'manual', cfg: 'a', svc: 'b' })
      const secondStore = await sm.loadStateStore()
      const entry = secondStore.states[0]
      Date.now = orig
      return { firstMd5, secondMd5, name: entry.name, ts: entry.ts, firstTs, len: secondStore.states.length }
    })
    const expected = crypto.createHash('md5').update('ab').digest('hex')
    expect(result.firstMd5).toBe(expected)
    expect(result.secondMd5).toBe(expected)
    expect(result.len).toBe(1)
    expect(result.name).toBe('two')
    expect(result.ts).toBeGreaterThan(result.firstTs)
  })

  test('clearAll removes stored keys', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      localStorage.setItem('config', '{}')
      localStorage.setItem('boards', '[]')
      localStorage.setItem('services', '[]')
      localStorage.setItem('asd-dashboard-state', '{}')
      sm.clearAll()
      return {
        c: localStorage.getItem('config'),
        b: localStorage.getItem('boards'),
        s: localStorage.getItem('services'),
        st: localStorage.getItem('asd-dashboard-state')
      }
    })
    expect(result.c).toBeNull()
    expect(result.b).toBeNull()
    expect(result.s).toBeNull()
    expect(result.st).toBeNull()
  })

  test('setServices normalizes service data', async ({ page }) => {
    const services = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      localStorage.clear()
      const raw = [
        { name: 'A', url: 'https://a.example' },
        { id: 'srv-fixed', name: 'B', url: '', type: 'custom', category: 'c', subcategory: 'sc', tags: ['t'], config: { x: 1 }, maxInstances: 5 }
      ]
      sm.setServices(raw as any)
      return sm.getServices()
    })
    expect(services).toHaveLength(2)
    expect(services[0].id).toMatch(/^srv-/)
    expect(services[0]).toMatchObject({
      name: 'A',
      url: 'https://a.example',
      type: 'iframe',
      category: '',
      subcategory: '',
      tags: [],
      config: {},
      maxInstances: null
    })
    expect(services[1]).toEqual({
      id: 'srv-fixed',
      name: 'B',
      url: '',
      type: 'custom',
      category: 'c',
      subcategory: 'sc',
      tags: ['t'],
      config: { x: 1 },
      maxInstances: 5
    })
  })

  test('clearAllExceptState preserves state store', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      localStorage.setItem('config', '{}')
      localStorage.setItem('boards', '[]')
      localStorage.setItem('services', '[]')
      localStorage.setItem('lastUsedBoardId', 'b1')
      localStorage.setItem('lastUsedViewId', 'v1')
      localStorage.setItem('asd-dashboard-state', '{"version":1,"states":[{"name":"snap"}]}')
      sm.clearAllExceptState()
      return {
        c: localStorage.getItem('config'),
        b: localStorage.getItem('boards'),
        s: localStorage.getItem('services'),
        lb: localStorage.getItem('lastUsedBoardId'),
        lv: localStorage.getItem('lastUsedViewId'),
        st: localStorage.getItem('asd-dashboard-state')
      }
    })
    expect(result.c).toBeNull()
    expect(result.b).toBeNull()
    expect(result.s).toBeNull()
    expect(result.lb).toBeNull()
    expect(result.lv).toBeNull()
    expect(result.st).not.toBeNull()
  })

  test('clearStateStore empties saved states', async ({ page }) => {
    const store = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      await sm.saveStateStore({ version: 1, states: [{ name: 'one' }] })
      await sm.clearStateStore()
      return localStorage.getItem('asd-dashboard-state')
    })
    const parsed = JSON.parse(store)
    expect(parsed.version).toBe(1)
    expect(Array.isArray(parsed.states)).toBeTruthy()
    expect(parsed.states.length).toBe(0)
  })
})