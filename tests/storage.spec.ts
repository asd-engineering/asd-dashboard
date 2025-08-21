import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { navigate } from './shared/common'
import crypto from 'crypto'

test.describe('StorageManager', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')
  })

  test('named export only', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const mod = await import('/storage/StorageManager.js')
      return { hasNamed: 'StorageManager' in mod, hasDefault: 'default' in mod }
    })
    expect(result.hasNamed).toBe(true)
    expect(result.hasDefault).toBe(false)
  })

  test('forceLocal sets driver meta', async ({ page }) => {
    const driver = await page.evaluate(async () => {
      const { StorageManager: sm } = await import('/storage/StorageManager.js')
      await sm.init({ persist: false, forceLocal: true })
      return sm.misc.getItem('driver')
    })
    expect(driver).toBe('localStorage')
  })

  test('setConfig stores config only', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { StorageManager: sm } = await import('/storage/StorageManager.js')
      const cfg = { boards: [{ id: 'b1', name: 'B1', views: [] }] }
      sm.setConfig(cfg)
      return { cfg: sm.getConfig(), boards: sm.getBoards() }
    })
    expect(result.boards).toHaveLength(1)
    expect(result.cfg.boards).toEqual(result.boards)
  })

  test('saveStateSnapshot persists and hashes', async ({ page }) => {
    const { hash, store } = await page.evaluate(async () => {
      const { StorageManager: sm } = await import('/storage/StorageManager.js')
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
      const { StorageManager: sm } = await import('/storage/StorageManager.js')
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
      const { StorageManager: sm } = await import('/storage/StorageManager.js')
      sm.setConfig({ foo: 'bar' })
      sm.setBoards([{ id: 'b1', name: 'B1', views: [] }])
      sm.setServices([{ name: 'svc', url: '' }])
      await sm.saveStateStore({ version: 1, states: [{ name: 's' }] })
      await sm.clearAll()
      return {
        cfg: sm.getConfig(),
        boards: sm.getBoards(),
        services: sm.getServices(),
        store: await sm.loadStateStore()
      }
    })
    expect(Object.keys(result.cfg).length).toBe(0)
    expect(result.boards).toHaveLength(0)
    expect(result.services).toHaveLength(0)
    expect(result.store.states).toHaveLength(0)
  })

  test('setServices sanitizes service data', async ({ page }) => {
    const services = await page.evaluate(async () => {
      const { StorageManager: sm } = await import('/storage/StorageManager.js')
      const raw = [
        { name: 'A', url: 'https://a.example' },
        { id: 'srv-fixed', name: 'B', url: '', type: 'custom', category: 'c', subcategory: 'sc', tags: ['t'], config: { x: 1 }, maxInstances: 5 }
      ]
      sm.setServices(raw as any)
      return sm.getServices()
    })
    expect(services).toHaveLength(2)
    expect(services[0]).toMatchObject({ name: 'A', url: 'https://a.example' })
    expect(services[0].id).toBeUndefined()
    expect(services[1]).toMatchObject({ id: 'srv-fixed', name: 'B', url: '' })
  })

  test('clearAllExceptState preserves state store', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { StorageManager: sm } = await import('/storage/StorageManager.js')
      sm.setConfig({ foo: 'bar' })
      sm.setBoards([{ id: 'b1', name: 'B1', views: [] }])
      sm.setServices([{ name: 'svc', url: '' }])
      sm.misc.setLastBoardId('b1')
      sm.misc.setLastViewId('v1')
      await sm.saveStateStore({ version: 1, states: [{ name: 'snap' }] })
      await sm.clearAllExceptState()
      return {
        cfg: sm.getConfig(),
        boards: sm.getBoards(),
        services: sm.getServices(),
        lb: sm.misc.getLastBoardId(),
        lv: sm.misc.getLastViewId(),
        st: await sm.loadStateStore()
      }
    })
    expect(Object.keys(result.cfg).length).toBe(0)
    expect(result.boards).toHaveLength(0)
    expect(result.services).toHaveLength(0)
    expect(result.lb).toBeNull()
    expect(result.lv).toBeNull()
    expect(result.st.states.length).toBeGreaterThan(0)
  })

  test('clearStateStore empties saved states', async ({ page }) => {
    const store = await page.evaluate(async () => {
      const { StorageManager: sm } = await import('/storage/StorageManager.js')
      await sm.saveStateStore({ version: 1, states: [{ name: 'one' }] })
      await sm.clearStateStore()
      return await sm.loadStateStore()
    })
    expect(store.version).toBe(1)
    expect(Array.isArray(store.states)).toBeTruthy()
    expect(store.states.length).toBe(0)
  })
})
