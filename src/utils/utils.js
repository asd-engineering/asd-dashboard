/**
 * Miscellaneous utility helpers.
 *
 * @module utils
 */

/**
 * Create a debounced version of a function.
 *
 * @function debounce
 * @param {Function} func - Function to debounce.
 * @param {number} wait - Delay in milliseconds.
 * @returns {Function}
 */
function debounce (func, wait) {
  let timeout
  return function executedFunction (...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Generate a UUID using the browser crypto API when available.
 *
 * @function getUUID
 * @returns {string}
 */
function getUUID () {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback: Generate RFC4122-compliant UUID v4 manually
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export { debounce, getUUID }
