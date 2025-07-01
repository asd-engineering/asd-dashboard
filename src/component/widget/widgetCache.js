// @ts-check
/**
 * LRU cache for widget DOM elements.
 *
 * @module widgetCache
 */

export class WidgetLRUCache {
  /**
   * @param {number} max
   */
  constructor (max) {
    this.max = max
    /** @type {Map<string, HTMLElement>} */
    this.cache = new Map()
  }

  /**
   * Retrieve an element and mark as recently used.
   * @param {string} id
   * @returns {HTMLElement|undefined}
   */
  get (id) {
    const el = this.cache.get(id)
    if (!el) return undefined
    this.cache.delete(id)
    this.cache.set(id, el)
    return el
  }

  /**
   * Add an element to the cache, evicting old entries if needed.
   * @param {string} id
   * @param {HTMLElement} el
   * @returns {void}
   */
  set (id, el) {
    const existing = this.cache.get(id)
    if (existing && existing !== el) {
      this._removeElement(id, existing)
    }
    this.cache.delete(id)
    this.cache.set(id, el)
    if (this.cache.size > this.max) {
      this.evict()
    }
  }

  /**
   * Remove the least recently used element from the cache.
   * @returns {void}
   */
  evict () {
    const firstKey = this.cache.keys().next().value
    if (firstKey) {
      const el = this.cache.get(firstKey)
      if (el) this._removeElement(firstKey, el)
      this.cache.delete(firstKey)
    }
  }

  /**
   * Clear all cached elements.
   * @returns {void}
   */
  clear () {
    for (const [key, el] of this.cache.entries()) {
      this._removeElement(key, el)
      this.cache.delete(key)
    }
  }

  /**
   * Get cache statistics.
   * @returns {{size:number, keys:string[]}}
   */
  stats () {
    return { size: this.cache.size, keys: Array.from(this.cache.keys()) }
  }

  /**
   * Internal helper to remove a widget element safely.
   * @private
   * @param {string} id
   * @param {HTMLElement} el
   */
  _removeElement (id, el) {
    const iframe = el.querySelector('iframe')
    try {
      if (iframe && iframe.contentWindow && iframe.contentWindow.origin === window.origin) {
        iframe.contentWindow.postMessage({ type: 'WIDGET_UNLOAD' }, '*')
      }
    } catch { /* ignore cross origin */ }
    el.remove()
    // explicit null to avoid leaks
    // @ts-ignore
    el = null
  }
}

/**
 * Determine if widget cache usage is disabled.
 * @returns {boolean}
 */
export function isCacheDisabled () {
  const params = new URLSearchParams(window.location.search)
  const param = params.get('noWidgetCache') === '1'
  const cfg = window.asd?.config?.globalSettings?.noWidgetCache === 'true'
  return param || cfg
}
