import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import crypto from 'crypto'

test.describe('StorageManager', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('setConfig wraps version and syncs boards', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      localStorage.clear()
      window.asd.boards = []
      const cfg = { boards: [{ id: 'b1', name: 'B1', views: [] }] }
      sm.setConfig(cfg)
      return {
        raw: localStorage.getItem('config'),
        boards: localStorage.getItem('boards'),
        cfg: sm.getConfig(),
        globalBoards: window.asd.boards
      }
    })
    expect(JSON.parse(result.raw)).toMatchObject({
      version: 1,
      data: { boards: [{ id: 'b1', name: 'B1', views: [] }] }
    })
    expect(JSON.parse(result.boards)).toEqual([{ id: 'b1', name: 'B1', views: [] }])
    expect(result.cfg).toEqual({ boards: [{ id: 'b1', name: 'B1', views: [] }] })
    expect(result.globalBoards).toEqual([{ id: 'b1', name: 'B1', views: [] }])
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
})
