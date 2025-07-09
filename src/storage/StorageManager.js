// @ts-check
/**
 * Centralized manager for loading and saving dashboard state.
 *
 * @module storage/StorageManager
 */

import { md5Hex } from '../utils/hash.js'
/**
 * CURRENT_VERSION for stored data schema.
 * @constant {number}
 */
export const CURRENT_VERSION = 1

const KEYS = {
  CONFIG: 'config',
  BOARDS: 'boards',
  SERVICES: 'services',
  STATES: 'asd-dashboard-state',
  LAST_BOARD: 'lastUsedBoardId',
  LAST_VIEW: 'lastUsedViewId'
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
 * Singleton API for storing and retrieving dashboard data.
 */
const StorageManager = {
  /**
   * Get the persisted dashboard configuration.
   * @function getConfig
   * @returns {DashboardConfig|null}
   */
  getConfig () {
    return jsonGet(KEYS.CONFIG, null)
  },

  /**
   * Persist the dashboard configuration.
   * @function setConfig
   * @param {DashboardConfig} cfg
   * @returns {void}
   */
  setConfig (cfg) {
    jsonSet(KEYS.CONFIG, cfg)
  },

  /**
   * Retrieve stored boards array.
   * @function getBoards
   * @returns {Array<Board>}
   */
  getBoards () {
    const boards = jsonGet(KEYS.BOARDS, [])
    return Array.isArray(boards) ? boards : []
  },

  /**
   * Persist the provided boards array.
   * @function setBoards
   * @param {Array<Board>} boards
   * @returns {void}
   */
  setBoards (boards) {
    jsonSet(KEYS.BOARDS, boards)
  },

  /**
   * Atomically update boards via callback.
   * @function updateBoards
   * @param {(boards: Array<Board>) => Array<Board>|void} updater
   * @returns {void}
   */
  updateBoards (updater) {
    const boards = StorageManager.getBoards()
    const result = updater(boards)
    const finalBoards = Array.isArray(result) ? result : boards
    StorageManager.setBoards(finalBoards)
  },

  /**
   * Retrieve stored services array.
   * @function getServices
   * @returns {Array<Service>}
   */
  getServices () {
    const services = jsonGet(KEYS.SERVICES, [])
    window.asd.services = Array.isArray(services) ? services : []
    return window.asd.services
  },

  /**
   * Persist the provided services array.
   * @function setServices
   * @param {Array<Service>} services
   * @returns {void}
   */
  setServices (services) {
    jsonSet(KEYS.SERVICES, services)
    window.asd.services = Array.isArray(services) ? services : []
  },

  /**
  * Load and return the entire state store.
  * @function loadStateStore
   * @returns {Promise<{version:number,states:Array}>}
   */
  async loadStateStore () {
    const store = jsonGet(KEYS.STATES, { version: CURRENT_VERSION, states: [] })
    if (typeof store === 'object' && store !== null && !('version' in store)) {
      store.version = 1
    }
    return store
  },

  /**
   * Persist the entire state store object.
   * @function saveStateStore
   * @param {{version:number,states:Array}} store
   * @returns {Promise<void>}
   */
  async saveStateStore (store) {
    jsonSet(KEYS.STATES, store)
  },

  /**
  * Save the current state snapshot.
  * @function saveStateSnapshot
   * @param {{name:string,type:string,cfg:string,svc:string}} snapshot
   * @returns {Promise<string>} Hash of the snapshot
   */
  async saveStateSnapshot ({ name, type, cfg, svc }) {
    const store = await StorageManager.loadStateStore()
    const blob = cfg + svc
    const hash = md5Hex(blob)
    store.states.unshift({ name, ts: Date.now(), type, md5: hash, cfg, svc })
    jsonSet(KEYS.STATES, store)
    return hash
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
