// @ts-check
/**
 * IndexedDB-backed StorageManager with warmed cache, migration and validation.
 * @module storage/StorageManager
 */

import { md5Hex } from '../utils/hash.js'
import { createDriver } from './driver.js'
import { sanitizeBoards, sanitizeConfig, sanitizeServices } from './validators.js'
import { busInit, busPost, busOnMessage } from './bus.js'
import { idbKV, onVersionChange as onIDBVersionChange } from './adapters/idbKV.js'

/**
 * CURRENT_VERSION for stored data schema.
 * @constant {number}
 */
export const CURRENT_VERSION = 1

/**
 * Custom event dispatched whenever the application state changes.
 * @constant {string}
 */
export const APP_STATE_CHANGED = 'appStateChanged'

let kv
const cache = {
  config: {},
  boards: [],
  services: [],
  meta: { migrated: false }
}

/**
 * Dispatch an application state change event.
 * @param {string} reason
 * @param {object} payload
 * @returns {void}
 */
function dispatchChange (reason, payload) {
  window.dispatchEvent(new CustomEvent(APP_STATE_CHANGED, { detail: { reason, ...payload } }))
}

// -- helpers ---------------------------------------------------------------
/**
 * Read a value from the meta store.
 * @param {string} key
 * @param {any} [def]
 * @returns {Promise<any>}
 */
async function getMeta (key, def = null) {
  return (await kv.get('meta', key)) ?? def
}
/**
 * Write a value to the meta store and update cache.
 * @param {string} key
 * @param {any} val
 * @returns {Promise<void>}
 */
async function setMeta (key, val) {
  await kv.set('meta', key, val)
  cache.meta[key] = val
}

// Legacy localStorage keys
const LS_KEYS = {
  CONFIG: 'config',
  BOARDS: 'boards',
  SERVICES: 'services',
  STATE: 'asd-dashboard-state',
  LAST_BOARD: 'lastUsedBoardId',
  LAST_VIEW: 'lastUsedViewId'
}

/**
 * One-time migration from legacy localStorage keys.
 * @returns {Promise<void>}
 */
async function migrateFromLocalStorageIfNeeded () {
  const already = await getMeta('migrated', false)
  if (already) return

  let rawCfg = null; let rawBoards = null; let rawSvcs = null; let rawState = null
  let lastBoardId = null; let lastViewId = null
  try { rawCfg = JSON.parse(localStorage.getItem(LS_KEYS.CONFIG) || 'null') } catch {}
  try { rawBoards = JSON.parse(localStorage.getItem(LS_KEYS.BOARDS) || 'null') } catch {}
  try { rawSvcs = JSON.parse(localStorage.getItem(LS_KEYS.SERVICES) || 'null') } catch {}
  try { rawState = JSON.parse(localStorage.getItem(LS_KEYS.STATE) || 'null') } catch {}
  try { lastBoardId = localStorage.getItem(LS_KEYS.LAST_BOARD) } catch {}
  try { lastViewId = localStorage.getItem(LS_KEYS.LAST_VIEW) } catch {}

  const cfgData = sanitizeConfig(rawCfg?.data || rawCfg || {})
  const boards = sanitizeBoards(rawBoards || cfgData.boards || [])
  const services = sanitizeServices(rawSvcs || [])

  if (cfgData.boards) delete cfgData.boards

  if (rawCfg || rawBoards || rawSvcs || rawState || lastBoardId || lastViewId) {
    await Promise.all([
      kv.set('config', 'v1', cfgData),
      kv.set('boards', 'v1', boards),
      kv.set('services', 'v1', services),
      kv.set('state_store', 'v1', rawState || { version: 1, states: [] })
    ])
    if (lastBoardId) await setMeta('lastBoardId', lastBoardId)
    if (lastViewId) await setMeta('lastViewId', lastViewId)
    const byteLen = obj => { try { return new TextEncoder().encode(JSON.stringify(obj)).length } catch { return -1 } }
    await kv.set('meta', 'storeSizes', {
      config: byteLen(cfgData),
      boards: byteLen(boards),
      services: byteLen(services),
      state_store: byteLen(rawState || { version: 1, states: [] })
    })
    await setMeta('migrationAt', new Date().toISOString())
  }

  localStorage.removeItem(LS_KEYS.CONFIG)
  localStorage.removeItem(LS_KEYS.BOARDS)
  localStorage.removeItem(LS_KEYS.SERVICES)
  localStorage.removeItem(LS_KEYS.STATE)
  localStorage.removeItem(LS_KEYS.LAST_BOARD)
  localStorage.removeItem(LS_KEYS.LAST_VIEW)

  await setMeta('migrated', true)
}

/**
 * Populate in-memory cache from persistent stores.
 * @returns {Promise<void>}
 */
async function warmCache () {
  const cfg = (await kv.get('config', 'v1')) ?? {}
  const boards = (await kv.get('boards', 'v1')) ?? []
  const services = (await kv.get('services', 'v1')) ?? []
  const metaKeys = await kv.keys('meta')
  cache.config = sanitizeConfig(cfg)
  cache.boards = sanitizeBoards(boards)
  cache.services = sanitizeServices(services)
  cache.config.boards = cache.boards
  for (const key of metaKeys) {
    cache.meta[key] = await kv.get('meta', key)
  }
}

/**
 * Request persistent storage to reduce eviction risk.
 * @returns {Promise<boolean>}
 */
async function requestPersistence () {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) return false
  try { return await navigator.storage.persist() } catch { return false }
}

// -- API ------------------------------------------------------------------
export const StorageManager = {
  /**
   * Initialize storage layer, perform migration and warm the cache.
   * @function init
   * @param {{persist?:boolean, forceLocal?:boolean}} [opts]
   * @returns {Promise<void>}
   */
  async init (opts = { persist: true, forceLocal: false }) {
    try {
      kv = createDriver(!!opts.forceLocal)
      await migrateFromLocalStorageIfNeeded()
      await warmCache()
    } catch (e) {
      const { lsKV } = await import('./adapters/lsKV.js')
      kv = lsKV
      await warmCache()
      await setMeta('driver', 'localStorage')
      dispatchChange('driver-fallback', { store: 'meta' })
      busInit()
      return
    }
    if (opts.persist) await requestPersistence()
    await setMeta('driver', kv === idbKV ? 'idb' : 'localStorage')
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      try {
        const est = await navigator.storage.estimate()
        await kv.set('meta', 'quota', { usage: est.usage ?? null, quota: est.quota ?? null })
      } catch {}
    }
    busInit()
    busOnMessage(async m => {
      if (!m || m.type !== 'STORE_UPDATED') return
      const store = m.store
      if (store === 'config') {
        const cfg = (await kv.get('config', 'v1')) ?? {}
        cache.config = sanitizeConfig(cfg)
        cache.config.boards = cache.boards
        dispatchChange('remote-update:config', { store: 'config' })
      } else if (store === 'boards') {
        const boards = (await kv.get('boards', 'v1')) ?? []
        cache.boards = sanitizeBoards(boards)
        cache.config.boards = cache.boards
        dispatchChange('remote-update:boards', { store: 'boards' })
      } else if (store === 'services') {
        const services = (await kv.get('services', 'v1')) ?? []
        cache.services = sanitizeServices(services)
        dispatchChange('remote-update:services', { store: 'services' })
      } else if (store === 'state_store') {
        dispatchChange('remote-update:state_store', { store: 'state_store' })
      }
    })
    if (kv === idbKV) {
      onIDBVersionChange(async () => {
        const { lsKV } = await import('./adapters/lsKV.js')
        kv = lsKV
        await setMeta('driver', 'localStorage')
        dispatchChange('versionchange', { store: 'meta' })
      })
    }
  },

  // ---- Config ----
  getConfig () {
    return cache.config
  },
  setConfig (cfg) {
    const sanitized = sanitizeConfig(cfg)
    const boards = sanitizeBoards(sanitized.boards || [])
    delete sanitized.boards
    cache.config = sanitized
    cache.boards = boards
    cache.config.boards = boards
    kv.set('config', 'v1', sanitized)
    kv.set('boards', 'v1', boards)
    busPost({ type: 'STORE_UPDATED', store: 'config', at: Date.now() })
    busPost({ type: 'STORE_UPDATED', store: 'boards', at: Date.now() })
    dispatchChange('config', { store: 'config' })
  },
  updateConfig (updater) {
    const cfg = StorageManager.getConfig()
    updater(cfg)
    StorageManager.setConfig({ ...cfg })
  },

  // ---- Boards ----
  getBoards () {
    return cache.boards
  },
  setBoards (boards) {
    const sanitized = sanitizeBoards(boards)
    cache.boards = sanitized
    cache.config.boards = sanitized
    kv.set('boards', 'v1', sanitized)
    busPost({ type: 'STORE_UPDATED', store: 'boards', at: Date.now() })
    dispatchChange('boards', { store: 'boards' })
  },
  updateBoards (updater) {
    const boards = StorageManager.getBoards()
    const result = updater(boards)
    if (Array.isArray(result)) StorageManager.setBoards(result)
  },

  // ---- Services ----
  getServices () {
    return cache.services
  },
  setServices (services) {
    const sanitized = sanitizeServices(services)
    cache.services = sanitized
    kv.set('services', 'v1', sanitized)
    busPost({ type: 'STORE_UPDATED', store: 'services', at: Date.now() })
    dispatchChange('services', { store: 'services' })
  },

  // ---- State store ----
  async loadStateStore () {
    return (await kv.get('state_store', 'v1')) ?? { version: CURRENT_VERSION, states: [] }
  },
  async saveStateStore (store) {
    await kv.set('state_store', 'v1', store)
    busPost({ type: 'STORE_UPDATED', store: 'state_store', at: Date.now() })
    dispatchChange('state_store', { store: 'state_store' })
  },
  async saveStateSnapshot ({ name, type, cfg, svc }) {
    const store = await StorageManager.loadStateStore()
    const { store: updated, md5 } = upsertSnapshotByMd5(store, { name, type, cfg, svc })
    await StorageManager.saveStateStore(updated)
    return md5
  },

  // ---- Misc ----
  misc: {
    getLastBoardId () { return cache.meta.lastBoardId ?? null },
    setLastBoardId (id) { cache.meta.lastBoardId = id ?? null; kv.set('meta', 'lastBoardId', id ?? null) },
    getLastViewId () { return cache.meta.lastViewId ?? null },
    setLastViewId (id) { cache.meta.lastViewId = id ?? null; kv.set('meta', 'lastViewId', id ?? null) },
    getItem (key) { return cache.meta[key] ?? null },
    setItem (key, value) { cache.meta[key] = value; kv.set('meta', key, value) }
  },

  // ---- Utilities ----
  async clearAll () {
    await Promise.all([
      kv.clear('config'),
      kv.clear('boards'),
      kv.clear('services'),
      kv.clear('state_store'),
      kv.del('meta', 'lastBoardId'),
      kv.del('meta', 'lastViewId')
    ])
    cache.config = {}
    cache.boards = []
    cache.services = []
    cache.meta.lastBoardId = null
    cache.meta.lastViewId = null
  },
  async clearAllExceptState () {
    await Promise.all([
      kv.clear('config'),
      kv.clear('boards'),
      kv.clear('services'),
      kv.del('meta', 'lastBoardId'),
      kv.del('meta', 'lastViewId')
    ])
    cache.config = {}
    cache.boards = []
    cache.services = []
    cache.meta.lastBoardId = null
    cache.meta.lastViewId = null
  },
  async clearStateStore () {
    await kv.set('state_store', 'v1', { version: CURRENT_VERSION, states: [] })
  }
}

// --- Snapshot helper -----------------------------------------------------
/**
 * Insert or update a snapshot in the state store based on MD5 hash.
 * @function upsertSnapshotByMd5
 * @param {{version:number,states:Array}} store
 * @param {{name:string,type:string,cfg:string,svc:string}} snap
 * @returns {{store:{version:number,states:Array},md5:string,updated:boolean}}
 */
export function upsertSnapshotByMd5 (store, { name, type, cfg, svc }) {
  const md5 = md5Hex(cfg + svc)
  const list = Array.isArray(store.states) ? store.states : []
  const idx = list.findIndex(s => s.md5 === md5)
  const ts = Date.now()
  if (idx !== -1) {
    const existing = list[idx]
    existing.ts = ts
    if (name) existing.name = name
    if (idx !== 0) {
      list.splice(idx, 1)
      list.unshift(existing)
    }
    return { store, md5, updated: true }
  }
  list.unshift({ name, type, md5, cfg, svc, ts })
  return { store, md5, updated: false }
}
