// @ts-check
/**
 * Selects the best available key-value backend.
 * @module storage/driver
 */

import { idbKV } from './adapters/idbKV.js'
import { lsKV } from './adapters/lsKV.js'

/**
 * Create a storage driver, preferring IndexedDB unless forced otherwise.
 * @function createDriver
 * @param {boolean} [forceLocal=false]
 * @returns {typeof idbKV}
 */
export function createDriver (forceLocal = false) {
  const idbAvailable = typeof indexedDB !== 'undefined'
  const useIDB = !forceLocal && idbAvailable
  return useIDB ? idbKV : lsKV
}
