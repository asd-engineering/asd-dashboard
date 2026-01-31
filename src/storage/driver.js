// @ts-check
/**
 * Selects the best available key-value backend.
 * @module storage/driver
 */

import { idbKV } from './adapters/idbKV.js'
import { lsKV } from './adapters/lsKV.js'

/**
 * @typedef {Object} KV
 * @property {(store:string,key:string)=>Promise<any>} get
 * @property {(store:string,key:string,val:any)=>Promise<void>} set
 * @property {(store:string,key:string)=>Promise<void>} del
 * @property {(store:string)=>Promise<void>} clear
 * @property {(store:string)=>Promise<Array<any>>} keys
 */

/**
 * Create a storage driver, preferring IndexedDB unless forced otherwise.
 * @function createDriver
 * @param {boolean} [forceLocal=false]
 * @returns {KV}
 */
export function createDriver (forceLocal = false) {
  const idbAvailable = typeof indexedDB !== 'undefined'
  const useIDB = !forceLocal && idbAvailable
  return useIDB ? idbKV : lsKV
}
