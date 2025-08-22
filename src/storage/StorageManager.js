// @ts-check
/**
 * Centralized manager for loading and saving dashboard state.
 *
 * @module storage/StorageManager
 */

import { md5Hex } from '../utils/hash.js'
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

const KEYS = {
  CONFIG: 'config',
  BOARDS: 'boards',
  SERVICES: 'services',
  STATES: 'asd-dashboard-state',
  LAST_BOARD: 'lastUsedBoardId',
  LAST_VIEW: 'lastUsedViewId'
}

/**
 * Merge user-supplied config with defaults.
 * Ensures globalSettings, boards, and other top-level keys always exist.
 *
 * @param {object} userConfig - The config object loaded from storage or URL
 * @returns {object} - Fully shaped config matching DEFAULT_CONFIG_TEMPLATE
 */
function mergeWithDefaults (userConfig = {}) {
  return deepMerge(DEFAULT_CONFIG_TEMPLATE, userConfig)
}

/**
 * Read and parse JSON value from localStorage.
 * @function jsonGet
 * @param {string} key
 * @param {any|null} [fallback=null]
 * @returns {any}
 */
function jsonGet (key, fallback = null) {
  const value = localStorage.getItem(key)
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch (_) {
    return fallback
  }
}

/**
 * Stringify and store value in localStorage.
 * @function jsonSet
 * @param {string} key
 * @param {any} obj
 * @returns {void}
 */
function jsonSet (key, obj) {
  if (obj === undefined || obj === null) {
    localStorage.removeItem(key)
  } else {
    localStorage.setItem(key, JSON.stringify(obj))
  }
}

/** @typedef {import('../types.js').DashboardConfig} DashboardConfig */
/** @typedef {import('../types.js').Board} Board */
/** @typedef {import('../types.js').Service} Service */

/**
 * Insert or update a snapshot in the state store based on MD5 hash.
 *
 * If a snapshot with the same MD5 exists its timestamp is refreshed and it is
 * moved to the front of the list. Optionally updates the name when provided.
 *
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

/**
 * Singleton API for storing and retrieving dashboard data.
 */
const StorageManager = {
  /**
   * Get the persisted dashboard configuration.
   * @function getConfig
   * @returns {DashboardConfig|null}
   */
  getConfig () {
    const stored = jsonGet(KEYS.CONFIG, null)
    // Fallback to legacy unwrapped format
    const cfg = stored?.data || stored
    if (!cfg || typeof cfg !== 'object') return { ...DEFAULT_CONFIG_TEMPLATE }
    return mergeWithDefaults(cfg)
  },

  /**
   * Persist the dashboard configuration.
   * @function setConfig
   * @param {DashboardConfig} cfg
   * @returns {void}
   */
  setConfig (cfg /* DashboardConfig */) {
    // jsonSet(KEYS.CONFIG, { version: CURRENT_VERSION, data: cfg })
    jsonSet(KEYS.CONFIG, {
      version: CURRENT_VERSION,
      data: mergeWithDefaults(cfg)
    })
    window.dispatchEvent(new CustomEvent(APP_STATE_CHANGED, { detail: { reason: 'config' } }))
  },

  /**
   * Atomically update the dashboard configuration.
   * @function updateConfig
   * @param {(cfg: DashboardConfig) => void} updater
   * @returns {void}
   */
  updateConfig (updater) {
    const cfg = StorageManager.getConfig()
    updater(cfg)
    StorageManager.setConfig(cfg)
  },

  /**
   * Retrieve stored boards array.
   * @function getBoards
   * @returns {Array<Board>}
   */
  getBoards () {
    return Array.isArray(StorageManager.getConfig().boards)
      ? StorageManager.getConfig().boards
      : []
  },

  /**
   * Persist the provided boards array.
   * @function setBoards
   * @param {Array<Board>} boards
   * @returns {void}
   */
  setBoards (boards) {
    StorageManager.updateConfig(cfg => { cfg.boards = Array.isArray(boards) ? boards : [] })
  },

  /**
   * Atomically update boards via callback.
   * @function updateBoards
   * @param {(boards: Array<Board>) => Array<Board>|void} updater
   * @returns {void}
   */
  updateBoards (updater) {
    StorageManager.updateConfig(cfg => {
      const result = updater(Array.isArray(cfg.boards) ? cfg.boards : [])
      if (Array.isArray(result)) cfg.boards = result
    })
  },

  /**
   * Retrieve stored services array.
   * @function getServices
   * @returns {Array<Service>}
   */
  getServices () {
    return jsonGet(KEYS.SERVICES, [])
  },

  /**
   * Persist the provided services array after resolving templates and normalizing.
   * @function setServices
   * @param {Array<Service>} services
   * @returns {void}
   */
  setServices (services) {
    // 1. Get the current config to access the service templates
    const config = this.getConfig() // 'this' refers to the StorageManager singleton
    const templates = config.serviceTemplates || {}

    const resolvedAndNormalizedServices = services.map(rawService => {
      // 2. Apply the appropriate template to get a fully resolved service object
      const templateName = rawService.template || 'default'
      const baseTemplate = templates[templateName] || templates.default || {}
      const mergedService = deepMerge(baseTemplate, rawService)

      // 3. Normalize the resolved object to guarantee essential fields
      return {
        ...mergedService, // Start with the fully merged object
        id: mergedService.id || serviceGetUUID(),
        name: mergedService.name || 'Unnamed Service',
        url: mergedService.url || '',
        type: mergedService.type || 'iframe',
        category: mergedService.category || '',
        subcategory: mergedService.subcategory || '',
        tags: Array.isArray(mergedService.tags) ? mergedService.tags : [],
        config: mergedService.config || {},
        maxInstances: mergedService.maxInstances !== undefined ? mergedService.maxInstances : null
      }
    })

    jsonSet(KEYS.SERVICES, resolvedAndNormalizedServices)
    window.dispatchEvent(new CustomEvent(APP_STATE_CHANGED, { detail: { reason: 'services' } }))
  },

  /**
  * Load and return the entire state store.
  * @function loadStateStore
   * @returns {Promise<{version:number,states:Array}>}
   */
  async loadStateStore () {
    const store = jsonGet(KEYS.STATES, { version: CURRENT_VERSION, states: [] })
    if (!('version' in store)) store.version = CURRENT_VERSION
    return store
  },

  /**
   * Persist the entire state store object.
   * @function saveStateStore
   * @param {{version:number,states:Array}} store
   * @returns {Promise<void>}
   */
  async saveStateStore (store) { jsonSet(KEYS.STATES, store) },

  /**
  * Save the current state snapshot.
  * @function saveStateSnapshot
   * @param {{name:string,type:string,cfg:string,svc:string}} snapshot
  * @returns {Promise<string>} Hash of the snapshot
  */
  async saveStateSnapshot ({ name, type, cfg, svc }) {
    const store = await StorageManager.loadStateStore()
    const { store: updated, md5 } = upsertSnapshotByMd5(store, { name, type, cfg, svc })
    await StorageManager.saveStateStore(updated)
    return md5
  },

  /**
  * Remove all persisted data.
  * @function clearAll
  * @returns {void}
  */
  clearAll () {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key))
  },

  /**
   * Remove persisted config, boards, services and last used ids while keeping saved states.
   * @function clearAllExceptState
   * @returns {void}
   */
  clearAllExceptState () {
    [KEYS.CONFIG, KEYS.BOARDS, KEYS.SERVICES, KEYS.LAST_BOARD, KEYS.LAST_VIEW].forEach(key => localStorage.removeItem(key))
  },

  /**
   * Reset the state store to an empty list.
   * @function clearStateStore
   * @returns {Promise<void>}
   */
  async clearStateStore () {
    await StorageManager.saveStateStore({ version: CURRENT_VERSION, states: [] })
  },

  /**
   * Miscellaneous helpers for simple string keys.
   */
  misc: {
    /**
     * Retrieve the last used board id.
     * @function getLastBoardId
     * @returns {string|null}
     */
    getLastBoardId () {
      return localStorage.getItem(KEYS.LAST_BOARD)
    },

    /**
     * Persist the last used board id.
     * @function setLastBoardId
     * @param {string|null} id
     * @returns {void}
     */
    setLastBoardId (id) {
      if (id) localStorage.setItem(KEYS.LAST_BOARD, id)
      else localStorage.removeItem(KEYS.LAST_BOARD)
    },

    /**
     * Retrieve the last used view id.
     * @function getLastViewId
     * @returns {string|null}
     */
    getLastViewId () {
      return localStorage.getItem(KEYS.LAST_VIEW)
    },

    /**
     * Persist the last used view id.
     * @function setLastViewId
     * @param {string|null} id
     * @returns {void}
     */
    setLastViewId (id) {
      if (id) localStorage.setItem(KEYS.LAST_VIEW, id)
      else localStorage.removeItem(KEYS.LAST_VIEW)
    },

    /**
     * Retrieve a raw string value from localStorage.
     *
     * @function getItem
     * @param {string} key
     * @returns {string|null}
     */
    getItem (key) {
      return localStorage.getItem(key)
    },

    /**
     * Persist a raw string value under a custom key.
     *
     * @function setItem
     * @param {string} key
     * @param {string|null} value
     * @returns {void}
     */
    setItem (key, value) {
      if (value === null || value === undefined) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, String(value))
      }
    },

    /**
     * Get all JSON-parsable items from localStorage.
     *
     * @function getAllJson
     * @returns {Record<string, any>}
     */
    getAllJson () {
      const data = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue
        const value = localStorage.getItem(key)
        try {
          data[key] = JSON.parse(value)
        } catch {
          // ignore unparsable entries
        }
      }
      return data
    },

    /**
     * Persist an object of key/value pairs as JSON strings.
     *
     * @function setJsonRecord
     * @param {Record<string, any>} record
     * @returns {void}
     */
    setJsonRecord (record) {
      for (const key in record) {
        localStorage.setItem(key, JSON.stringify(record[key]))
      }
    }
  }
}

export default StorageManager
