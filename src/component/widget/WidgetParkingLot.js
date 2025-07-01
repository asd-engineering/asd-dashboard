// @ts-check
/**
 * Parking lot for widget DOM elements.
 *
 * @module WidgetParkingLot
 * @class WidgetParkingLot
 */
export class WidgetParkingLot {
  /**
   * @param {number} limit Max number of cached widgets.
   */
  constructor (limit = 10) {
    this.limit = limit
    /** @type {Map<string, HTMLElement>} */
    this.cache = new Map()
  }

  /**
   * Retrieve a parked widget and mark as recently used.
   *
   * @param {string} key
   * @returns {HTMLElement|undefined}
   */
  retrieve (key) {
    const value = this.cache.get(key)
    if (value) {
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  /**
   * Park a widget, evicting the least recently used if needed.
   *
   * @param {string} key
   * @param {HTMLElement} el
   * @returns {void}
   */
  park (key, el) {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.limit) {
      const oldestKey = this.cache.keys().next().value
      const oldestEl = this.cache.get(oldestKey)
      if (oldestEl) {
        oldestEl.remove()
      }
      this.cache.delete(oldestKey)
    }
    el.remove()
    this.cache.set(key, el)
  }

  /**
   * Clear all cached widgets and remove them from the DOM.
   *
   * @returns {void}
   */
  clear () {
    for (const el of this.cache.values()) {
      el.remove()
    }
    this.cache.clear()
  }

  /**
   * Print debug info about the parking lot.
   *
   * @returns {{ size: number, keys: string[] }}
   */
  debugInfo () {
    const info = { size: this.cache.size, keys: Array.from(this.cache.keys()) }
    console.log('WidgetParkingLot', info)
    return info
  }
}
