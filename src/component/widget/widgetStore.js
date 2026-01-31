// @ts-check
/**
 * In-memory LRU store for widget DOM elements.
 *
 * @module widgetStore
 */
import { Logger } from '../../utils/Logger.js'
import { StorageManager } from '../../storage/StorageManager.js'

/**
 * Lightweight LRU cache storing widget elements by id.
 * Evicts least recently used widgets when capacity is exceeded.
 * @class WidgetStore
 */
export class WidgetStore {
  /**
   * Create a new widget store.
   * @constructor
   * @param {number} [maxSize=10] - Maximum number of widgets to retain.
   */
  constructor (maxSize = 10) {
    this.maxSize = maxSize
    /** @type {Map<string, HTMLElement>} */
    this.widgets = new Map()
    this.logger = new Logger('widgetStore.js')
    /** @private */
    this._serviceLocks = new Map() // service → ref-count
  }

  /**
   * Resolve after all pending RAF removals.
   * @returns {Promise<void>}
   */
  idle () { return new Promise(resolve => requestAnimationFrame(() => resolve())) }

  /**
   * Store a widget element using its `dataid` attribute as the key.
   * Existing entries are refreshed.
   *
   * @param {HTMLElement} element
   * @function add
   * @returns {void}
   */
  add (element) {
    const id = element.dataset.dataid
    if (!id) return
    if (this.widgets.has(id)) {
      this.widgets.delete(id)
    }
    this.widgets.set(id, element)
    // Ensure we never exceed the capacity during initial load
    this._ensureLimit()
  }

  /**
   * Retrieve a widget element and mark it as recently used.
   *
   * @param {string} id
   * @function get
   * @returns {HTMLElement|undefined}
   */
  get (id) {
    if (!this.widgets.has(id)) return undefined
    const el = this.widgets.get(id)
    this.widgets.delete(id)
    this.widgets.set(id, el)
    return el
  }

  /**
   * Check if a widget exists in the store.
   *
   * @param {string} id
   * @function has
   * @returns {boolean}
   */
  has (id) {
    return this.widgets.has(id)
  }

  /**
   * Show a stored widget by id.
   *
   * @param {string} id
   * @function show
   * @returns {void}
   */
  show (id) {
    const el = this.get(id)
    if (el) {
      el.style.display = ''
    }
  }

  /**
   * Hide a stored widget by id.
   *
   * @param {string} id
   * @function hide
   * @returns {void}
   */
  hide (id) {
    const el = this.widgets.get(id)
    if (el) {
      el.style.display = 'none'
    }
  }

  /**
   * Check if a service is currently being added.
   *
   * @param {string} serviceName
   * @function isAdding
   * @returns {boolean}
   */
  isAdding (serviceName) {
    return this._serviceLocks.has(serviceName)
  }

  /**
   * Acquire the lock for a service name.
   *
   * @param {string} serviceName
   * @function lock
   * @returns {void}
   */
  lock (serviceName) {
    this._serviceLocks.set(
      serviceName,
      (this._serviceLocks.get(serviceName) ?? 0) + 1
    )
  }

  /**
   * Release the lock for a service name.
   *
   * @param {string} serviceName
   * @function unlock
   * @returns {void}
   */
  unlock (serviceName) {
    const n = (this._serviceLocks.get(serviceName) ?? 1) - 1
    n === 0
      ? this._serviceLocks.delete(serviceName)
      : this._serviceLocks.set(serviceName, n)
  }

  /**
   * Request removal of a widget from the DOM and store.
   *
   * @param {string} id
   * @function requestRemoval
   * @returns {Promise<void>}
   */
  async requestRemoval (id) {
    this._evict(id)
    await new Promise(resolve => requestAnimationFrame(resolve))
  }

  /**
   * Remove a widget instance from the live store/DOM only.
   * This NEVER mutates boards/views in StorageManager.
   * @param {string} id
   */
  async evictRuntimeOnly (id) {
    const el = this.widgets.get(id)
    if (!el) return
    try {
      el.remove()
    } catch {}
    this.widgets.delete(id)
    // If you track LRU or observers, notify them here (no StorageManager updates)
    // e.g., this._touchLRUOnEvict?.(id)
  }

  /**
   * Remove a widget from the DOM and store if it exists.
   * This is the sole method performing element.remove().
   *
   * @private
   * @param {string} id
   * @function _evict
   * @returns {void}
   */
  _evict (id) {
    const el = this.widgets.get(id)
    if (el) {
      try {
        el.remove()
      } catch (error) {
        this.logger.error('Error removing widget element:', error)
      }
      this.widgets.delete(id)
      this.logger.log('Evicted widget:', id)
    }
  }

  /**
   * Ensure the store does not exceed its capacity.
   * Older entries are evicted first.
   *
   * @private
   * @function _ensureLimit
   * @returns {void}
   */
  _ensureLimit () {
    while (this.widgets.size > this.maxSize) {
      const oldestId = this.widgets.keys().next().value
      this._evict(oldestId)
    }
  }

  /**
   * Find the first widget instance for a given service name.
   *
   * @param {string} serviceName
   * @function findFirstWidgetByService
   * @returns {HTMLElement|undefined}
   */
  findFirstWidgetByService (serviceName) {
    for (const el of this.widgets.values()) {
      if (el.dataset.service === serviceName) return el
    }
    return undefined
  }

  /**
   * Ensure capacity before adding widgets. Prompts for eviction when full.
   * Evictions are RUNTIME-ONLY: persistent StorageManager is never modified.
   * @param {number} [needed=1] Number of widgets that will be added.
   * @returns {Promise<boolean>} true if we can proceed, false if user cancelled.
   */
  async confirmCapacity (needed = 1) {
    const maxTotal = StorageManager.getConfig()?.globalSettings?.maxTotalInstances
    const allowedMax = typeof maxTotal === 'number'
      ? Math.min(this.maxSize, maxTotal)
      : this.maxSize

    const overBy = this.widgets.size + needed - allowedMax
    if (overBy > 0) {
      // Build selection items from CURRENTLY ACTIVE widgets only (runtime, not storage).
      const items = []
      let idx = 0

      const boards = StorageManager.getBoards() || []
      /** @type {Record<string,{boardIndex:number,viewIndex:number}>} */
      const locCache = {}
      const getIdx = (id) => {
        if (locCache[id]) return locCache[id]
        for (let b = 0; b < boards.length; b++) {
          const views = boards[b].views || []
          for (let v = 0; v < views.length; v++) {
            const ws = views[v].widgetState || []
            if (ws.some(w => w.dataid === id)) {
              locCache[id] = { boardIndex: b, viewIndex: v }
              return locCache[id]
            }
          }
        }
        locCache[id] = { boardIndex: 0, viewIndex: 0 }
        return locCache[id]
      }

      for (const [id, el] of this.widgets.entries()) {
        let title = null
        if (el.dataset.metadata) {
          try { title = JSON.parse(el.dataset.metadata).title || null } catch {}
        }
        const serviceName = el.dataset.service || ''
        const key = serviceName.toLowerCase().split('asd-')[1] || serviceName.toLowerCase()
        const icon = (await import('../../ui/unicodeEmoji.js')).default[key]?.unicode || '🧱'
        const { boardIndex, viewIndex } = getIdx(id)
        items.push({ id, title, serviceName, icon, boardIndex, viewIndex, lruRank: idx++ })
      }

      const gs = StorageManager.getConfig()?.globalSettings
      const maxPerService = (gs && typeof gs === 'object' && 'maxPerService' in gs && typeof gs.maxPerService === 'number')
        ? gs.maxPerService
        : 0

      const { openEvictionModal } = await import('../modal/evictionModal.js')
      const proceed = await openEvictionModal({
        reason: 'capacity',
        maxPerService,
        requiredCount: overBy,
        items,
        onEvict: async (ids) => {
          // IMPORTANT: runtime-only eviction; do NOT touch StorageManager
          for (const id of ids) {
            await this.evictRuntimeOnly(id)
          }
          this._ensureLimit() // keep internal invariants
        }
      })

      // If user cancelled, DO NOT navigate or mutate anything.
      if (!proceed) return false
    }

    return true
  }
}

export const widgetStore = new WidgetStore()
