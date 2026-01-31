// @ts-check
/**
 * Fallback localStorage key-value adapter implementing the same interface as idbKV.
 * Keys are namespaced by store name. Values are JSON strings.
 * @module storage/adapters/lsKV
 */

import { safeParse, stableStringify } from '../jsonUtil.js'

/**
 * Namespace helper for localStorage keys.
 * @param {string} store
 * @param {string} key
 * @returns {string}
 */
function ns (store, key) { return `asd.${store}.${key}` }

/** @type {{get(store:string,key:string):Promise<any>,set(store:string,key:string,value:any):Promise<void>,del(store:string,key:string):Promise<void>,clear(store:string):Promise<void>,keys(store:string):Promise<Array<any>>}} */
export const lsKV = {
  async get (store, key) {
    if (typeof localStorage === 'undefined') return undefined
    return safeParse(localStorage.getItem(ns(store, key)) || 'null', undefined)
  },
  async set (store, key, value) {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(ns(store, key), stableStringify(value))
  },
  async del (store, key) {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(ns(store, key))
  },
  async clear (store) {
    if (typeof localStorage === 'undefined') return
    const prefix = `asd.${store}.`
    const toDel = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(prefix)) toDel.push(k)
    }
    toDel.forEach(k => localStorage.removeItem(k))
  },
  async keys (store) {
    if (typeof localStorage === 'undefined') return []
    const ks = []
    const prefix = `asd.${store}.`
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(prefix)) ks.push(k.slice(prefix.length))
    }
    return ks
  }
}
