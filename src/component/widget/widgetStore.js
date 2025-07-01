// @ts-check
/**
 * In-memory LRU store for widget DOM elements.
 *
 * @module widgetStore
 */
import { Logger } from '../../utils/Logger.js'

/**
 * Lightweight LRU cache storing widget elements by id.
 * Evicts least recently used widgets when capacity is exceeded.
 * @class WidgetStore
 */
export class WidgetStore {
  /**
   * @constructor
   * @param {number} [maxSize=50] - Maximum number of widgets to retain.
   */
  constructor (maxSize = 50) {
    this.maxSize = maxSize
    /** @type {Map<string, HTMLElement>} */
    this.widgets = new Map()
    this.logger = new Logger('widgetStore.js')
  }

  /**
   * Store a widget element by id. Existing entries are refreshed.
   *
   * @param {string} id
   * @param {HTMLElement} element
   * @function add
   * @returns {void}
   */
  add (id, element) {
    if (this.widgets.has(id)) {
      this.widgets.delete(id)
    }
    this.widgets.set(id, element)
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
   * Request removal of a widget from the DOM and store.
   *
   * @param {string} id
   * @function requestRemoval
   * @returns {void}
   */
  requestRemoval (id) {
    this._evict(id)
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
      el.remove()
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
}

export const widgetStore = new WidgetStore()
