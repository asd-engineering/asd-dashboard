// @ts-check
/**
 * Minimal IndexedDB key-value adapter with multiple stores.
 * @module storage/adapters/idbKV
 */
/* global indexedDB */

const DB_NAME = 'asd-db'
const VERSION = 1
const STORES = ['config', 'boards', 'services', 'state_store', 'meta']

/**
 * Open the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function openDB () {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB not available'))
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Run a transaction on a store.
 * @param {string} storeName
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore, resolve: (value: any) => void, reject: (reason?: any) => void) => void} run
 * @returns {Promise<any>}
 */
async function withStore (storeName, mode, run) {
  const db = await openDB()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode)
      const store = tx.objectStore(storeName)
      tx.oncomplete = () => resolve(undefined)
      tx.onerror = () => reject(tx.error)
      run(store, resolve, reject)
    })
  } finally {
    db.close()
  }
}

/** @type {{get(store:string,key:string):Promise<any>,set(store:string,key:string,value:any):Promise<void>,del(store:string,key:string):Promise<void>,clear(store:string):Promise<void>,keys(store:string):Promise<Array<any>>}} */
export const idbKV = {
  async get (store, key) {
    let out
    await withStore(store, 'readonly', (s, res) => {
      const r = s.get(key)
      r.onsuccess = () => { out = r.result; res(out) }
    })
    return out
  },
  async set (store, key, value) {
    await withStore(store, 'readwrite', (s, res) => { s.put(value, key); res(undefined) })
  },
  async del (store, key) {
    await withStore(store, 'readwrite', (s, res) => { s.delete(key); res(undefined) })
  },
  async clear (store) {
    await withStore(store, 'readwrite', (s, res) => { s.clear(); res(undefined) })
  },
  async keys (store) {
    const keys = []
    await withStore(store, 'readonly', (s, res) => {
      const c = s.openKeyCursor()
      c.onsuccess = () => {
        const cur = c.result
        if (cur) {
          keys.push(cur.key)
          cur.continue()
        } else {
          res(keys)
        }
      }
    })
    return keys
  }
}
