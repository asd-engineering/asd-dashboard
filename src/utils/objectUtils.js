// @ts-check
/**
 * Utility functions for deep object comparison and inspection.
 * @module utils/objectUtils
 */

/**
 * Recursively compares two values for deep equality.
 * Supports plain objects, arrays, primitives, and null/undefined.
 *
 * @function deepEqual
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
export function deepEqual(a, b) {
  if (a === b) return true

  if (typeof a !== typeof b) return false

  if (typeof a !== 'object' || a === null || b === null) {
    return false
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false

  for (const key of aKeys) {
    if (!bKeys.includes(key)) return false
    if (!deepEqual(a[key], b[key])) return false
  }

  return true
}
