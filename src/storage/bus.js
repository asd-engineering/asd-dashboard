// @ts-check
/**
 * BroadcastChannel-based event bus for cross-tab storage sync.
 * @module storage/bus
 */

const NAME = 'asd-storage'
let ch = null

/** Initialize the broadcast channel. */
export function busInit () {
  if (typeof BroadcastChannel === 'undefined') return
  try {
    ch = new BroadcastChannel(NAME)
  } catch {
    ch = null
  }
}

/**
 * Post a message on the channel.
 * @param {any} msg
 */
export function busPost (msg) {
  if (!ch) return
  try { ch.postMessage(msg) } catch {}
}

/**
 * Register a handler for incoming messages.
 * @param {(msg:any) => void} handler
 */
export function busOnMessage (handler) {
  if (!ch) return
  ch.onmessage = ev => {
    const m = ev?.data
    if (!m || typeof m !== 'object') return
    handler(m)
  }
}
