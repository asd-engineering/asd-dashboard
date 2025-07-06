// @ts-check
import StorageManager from './StorageManager.js'

/**
 * Loads the array of services from localStorage.
 * @function load
 * @returns {Array<import('../types.js').Service>} An array of service objects.
 */
export function load () {
  try {
    return StorageManager.getServices()
  } catch (e) {
    console.error('Failed to parse services from storage:', e)
    return []
  }
}

/**
 * Saves the array of services to localStorage.
 * @function save
 * @param {Array<import('../types.js').Service>} services - The array of services to save.
 * @returns {void}
 */
export function save (services) {
  StorageManager.setServices(services)
}
