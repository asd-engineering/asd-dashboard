// @ts-check
/**
 * Least recently used cache for widget DOM elements.
 *
 * @module widgetCache
 */
import { Logger } from '../../utils/Logger.js'

const logger = new Logger('widgetCache.js')

class WidgetCache {
  /**
   * @param {number} limit
   */
  constructor (limit = 10) {
    /** @type {Map<string, HTMLElement>} */
    this.cache = new Map()
    this.limit = limit
  }

  /**
   * Retrieve a widget and mark it as recently used.
   *
   * @param {string} id
   * @function get
   * @returns {HTMLElement|undefined}
   */
  get (id) {
    const item = this.cache.get(id)
    if (!item) {
      logger.log('Cache miss for widget', id)
      return undefined
    }
    this.cache.delete(id)
    this.cache.set(id, item)
    logger.log('Cache hit for widget', id)
    return item
  }

  /**
   * Add a widget to the cache.
   * Evicts the least recently used item if the limit is exceeded.
   *
   * @param {string} id
   * @param {HTMLElement} element
   * @function add
   * @returns {void}
   */
  add (id, element) {
    if (this.cache.has(id)) {
      this.cache.delete(id)
    }
    this.cache.set(id, element)
    logger.log('Added widget to cache', id)
    if (this.cache.size > this.limit) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
      logger.log('Evicted widget from cache', firstKey)
    }
  }

  /**
   * Remove a widget from the cache.
   *
   * @param {string} id
   * @function remove
   * @returns {void}
   */
  remove (id) {
    if (this.cache.delete(id)) {
      logger.log('Removed widget from cache', id)
    }
  }

  /**
   * Set maximum cache size and evict extra items.
   *
   * @param {number} size
   * @function setLimit
   * @returns {void}
   */
  setLimit (size) {
    this.limit = size
    logger.log('Cache limit set to', size)
    while (this.cache.size > this.limit) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
      logger.log('Evicted widget from cache due to limit', firstKey)
    }
  }
}

export const widgetCache = new WidgetCache()
