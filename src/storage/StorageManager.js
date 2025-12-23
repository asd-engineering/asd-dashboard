// @ts-check
/**
 * IndexedDB-backed StorageManager with warmed cache, migration and validation.
 * @module storage/StorageManager
 */

import { md5Hex } from '../utils/hash.js'
import { createDriver } from './driver.js'
import { sanitizeBoards, sanitizeConfig, sanitizeServices } from './validators.js'
import { busInit, busPost, busOnMessage } from './bus.js'
import { idbKV, onVersionChange } from './adapters/idbKV.js'
import { lsKV } from './adapters/lsKV.js'
import { DEFAULT_CONFIG_TEMPLATE } from './defaultConfig.js'
import { deepMerge } from '../utils/objectUtils.js'
import { serviceGetUUID } from '../utils/id.js'

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

let kv = lsKV
const cache = {
  config: {},
  boards: [],
  services: [],
  meta: { migrated: false }
}

/**
 * Track pending writes for flush support.
 * @type {Promise<void>[]}
 */
const pendingWrites = []

/**
 * Track a write promise and clean it up when done.
 * @param {Promise<void>} promise
 */
function trackWrite (promise) {
  pendingWrites.push(promise)
  promise.finally(() => {
    const idx = pendingWrites.indexOf(promise)
    if (idx !== -1) {
      // Removing completed promise from tracking array (returns removed elements, ignored intentionally)
      const _ = pendingWrites.splice(idx, 1)
      if (_) { /* noop - suppress unused var */ }
    }
  }).catch(() => {}) // Intentional no-op: cleanup runs regardless of resolve/reject
}

/**
 * Dispatch an application state change event.
 * @param {string} reason
 * @param {object} [detail]
 * @returns {void}
 */
function dispatchChange (reason, detail = {}) {
  try {
    window.dispatchEvent(new CustomEvent(APP_STATE_CHANGED, { detail: { reason, ...detail } }))
  } catch (e) {
    console.warn('dispatchChange failed:', e)
  }
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

  const cfg = sanitizeConfig(rawCfg?.data || rawCfg || {})
  const boards = sanitizeBoards(rawBoards || cfg.boards || [])
  const svcs = sanitizeServices(rawSvcs || [])

  if (cfg.boards) delete cfg.boards

  const writes = []
  if (Object.keys(cfg).length) writes.push(kv.set('config', 'v1', cfg))
  if (boards.length) writes.push(kv.set('boards', 'v1', boards))
  if (svcs.length) writes.push(kv.set('services', 'v1', svcs))
  if (rawState) writes.push(kv.set('state_store', 'v1', rawState))
  if (writes.length) await Promise.all(writes)

  if (lastBoardId) await setMeta('lastBoardId', lastBoardId)
  if (lastViewId) await setMeta('lastViewId', lastViewId)

  try {
    localStorage.removeItem(LS_KEYS.CONFIG)
    localStorage.removeItem(LS_KEYS.BOARDS)
    localStorage.removeItem(LS_KEYS.SERVICES)
    localStorage.removeItem(LS_KEYS.STATE)
    localStorage.removeItem(LS_KEYS.LAST_BOARD)
    localStorage.removeItem(LS_KEYS.LAST_VIEW)
  } catch {}

  await setMeta('migrated', true)
  await setMeta('migrationAt', new Date().toISOString())
}

/**
 * Merge user-supplied config with defaults.
 * Ensures globalSettings, boards, and other top-level keys always exist.
 *
 * @param {object} userConfig - The config object loaded from storage or URL
 * @returns {object} - Fully shaped config matching DEFAULT_CONFIG_TEMPLATE
 */
function mergeWithDefaults (userConfig = {}) {
  const merged = deepMerge(DEFAULT_CONFIG_TEMPLATE, userConfig)
  if (!merged.globalSettings) merged.globalSettings = {}
  merged.globalSettings.theme = merged.globalSettings.theme === 'dark' ? 'dark' : 'light'
  return merged
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
 * Compute byte length of a JSON-serializable object.
 * @param {any} obj
 * @returns {number}
 */
function byteLen (obj) {
  try { return new TextEncoder().encode(JSON.stringify(obj)).length } catch { return -1 }
}

/**
 * Record quota and store size metrics after initialization.
 * @returns {Promise<void>}
 */
async function recordMetricsAfterInit () {
  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate()
      const quota = { usage: est.usage ?? null, quota: est.quota ?? null }
      await kv.set('meta', 'quota', quota)
      cache.meta.quota = quota
    } catch {}
  }
  const sizes = {
    config: byteLen(cache.config),
    boards: byteLen(cache.boards),
    services: byteLen(cache.services),
    state_store: byteLen((await kv.get('state_store', 'v1')) ?? {})
  }
  await kv.set('meta', 'storeSizes', sizes)
  cache.meta.storeSizes = sizes
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
      kv = lsKV
      await warmCache()
      await setMeta('driver', 'localStorage')
      await recordMetricsAfterInit()
      dispatchChange('driver-fallback', { driver: 'localStorage' })
      busInit()
      return
    }
    if (opts.persist) await requestPersistence()
    await setMeta('driver', kv === idbKV ? 'idb' : 'localStorage')
    await recordMetricsAfterInit()
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
      onVersionChange(async () => {
        const { lsKV } = await import('./adapters/lsKV.js')
        kv = lsKV
        await setMeta('driver', 'localStorage')
        dispatchChange('driver-fallback', { driver: 'localStorage' })
      })
    }
  },

  // ---- Config ----
  getConfig () {
    return cache.config
  },
  setConfig (cfg) {
    const merged = mergeWithDefaults(cfg)
    const sanitized = sanitizeConfig(merged)
    const boards = sanitizeBoards(sanitized.boards || [])
    delete sanitized.boards
    cache.config = sanitized
    cache.boards = boards
    cache.config.boards = boards
    trackWrite(kv.set('config', 'v1', sanitized).catch(() => {}))
    trackWrite(kv.set('boards', 'v1', boards).catch(() => {}))
    busPost({ type: 'STORE_UPDATED', store: 'config', at: Date.now() })
    busPost({ type: 'STORE_UPDATED', store: 'boards', at: Date.now() })
    dispatchChange('update:config', { store: 'config' })
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
    trackWrite(kv.set('boards', 'v1', sanitized).catch(() => {}))
    busPost({ type: 'STORE_UPDATED', store: 'boards', at: Date.now() })
    dispatchChange('update:boards', { store: 'boards' })
  },
  updateBoards (updater) {
    const boards = StorageManager.getBoards()
    const result = updater(boards)
    // If updater returns an array, use that; otherwise use the mutated boards array
    StorageManager.setBoards(Array.isArray(result) ? result : boards)
  },

  // ---- Services ----
  getServices () {
    return cache.services
  },

  setServices (services) {
    const config = this.getConfig()
    // Fall back to DEFAULT_CONFIG_TEMPLATE.serviceTemplates when config is empty/missing templates
    const templates = (config.serviceTemplates && Object.keys(config.serviceTemplates).length > 0)
      ? config.serviceTemplates
      : DEFAULT_CONFIG_TEMPLATE.serviceTemplates

    const resolvedAndNormalizedServices = services.map(rawService => {
      const templateName = rawService.template || 'default'
      const baseTemplate = templates[templateName] || templates.default || {}

      const mergedService = deepMerge(baseTemplate, rawService)

      return {
        ...mergedService,
        id: mergedService.id || serviceGetUUID(),
        name: mergedService.name || 'Unnamed Service',
        url: mergedService.url || '',
        type: mergedService.type || 'iframe',
        template: templateName,
        category: mergedService.category || '',
        subcategory: mergedService.subcategory || '',
        tags: Array.isArray(mergedService.tags) ? mergedService.tags : [],
        config: typeof mergedService.config === 'object' && mergedService.config ? mergedService.config : {},
        // THIS IS THE FIX: Properly fall back to null if not defined anywhere.
        maxInstances: typeof mergedService.maxInstances === 'number' ? mergedService.maxInstances : null
      }
    })

    const sanitized = sanitizeServices(resolvedAndNormalizedServices)
    cache.services = sanitized
    trackWrite(kv.set('services', 'v1', sanitized).catch(() => {}))
    busPost({ type: 'STORE_UPDATED', store: 'services', at: Date.now() })
    dispatchChange('update:services', { store: 'services' })
  },

  // ---- State store ----
  async loadStateStore () {
    return (await kv.get('state_store', 'v1')) ?? { version: CURRENT_VERSION, states: [] }
  },
  async saveStateStore (store) {
    await kv.set('state_store', 'v1', store)
    busPost({ type: 'STORE_UPDATED', store: 'state_store', at: Date.now() })
    dispatchChange('update:state_store', { store: 'state_store' })
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
    setLastBoardId (id) { cache.meta.lastBoardId = id ?? null; kv.set('meta', 'lastBoardId', id ?? null).catch(() => {}) },
    getLastViewId () { return cache.meta.lastViewId ?? null },
    setLastViewId (id) { cache.meta.lastViewId = id ?? null; kv.set('meta', 'lastViewId', id ?? null).catch(() => {}) },
    getItem (key) { return cache.meta[key] ?? null },
    setItem (key, value) { cache.meta[key] = value; kv.set('meta', key, value).catch(() => {}) }
  },

  // ---- Utilities ----
  /**
   * Wait for all pending IndexedDB writes to complete.
   * @returns {Promise<void>}
   */
  async flush () {
    if (pendingWrites.length > 0) {
      await Promise.all(pendingWrites)
    }
  },
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
