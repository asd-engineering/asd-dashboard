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