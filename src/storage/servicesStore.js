// @ts-check
const STORAGE_KEY = 'services'

/**
 * Loads the array of services from localStorage.
 * @function load
 * @returns {Array<import('../types.js').Service>} An array of service objects.
 */
export function load () {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (e) {
    console.error('Failed to parse services from localStorage:', e)
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services))
}
