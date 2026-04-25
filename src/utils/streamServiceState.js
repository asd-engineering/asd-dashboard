// @ts-check
/**
 * Thin wrapper over EventSource for the MCP /api/state/stream SSE endpoint.
 *
 * @module utils/streamServiceState
 */
import { Logger } from './Logger.js'

const logger = new Logger('streamServiceState.js')

/**
 * Subscribe to MCP service-state SSE.
 *
 * EventSource auto-reconnects on transient errors. The first error is logged;
 * subsequent reconnect attempts are silent.
 *
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {(services: Array<{id: string, status?: string, state?: string}>) => void} [opts.onSnapshot]
 * @param {(diffs: Array<{id: string, from: string, to: string}>) => void} [opts.onChange]
 * @param {(mode: 'nats' | 'poll') => void} [opts.onSourceMode]
 * @param {(err: Event) => void} [opts.onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeServiceState (opts) {
  const url = `${opts.baseUrl.replace(/\/$/, '')}/api/state/stream`
  /** @type {EventSource} */
  let es
  try {
    es = new EventSource(url)
  } catch (e) {
    logger.error('EventSource construction failed:', e)
    if (opts.onError) opts.onError(/** @type {any} */(e))
    return () => {}
  }

  let firstError = true

  const safeJson = (raw) => {
    try { return JSON.parse(raw) } catch { return null }
  }

  es.addEventListener('source', (e) => {
    const data = safeJson(/** @type {MessageEvent} */(e).data)
    if (data && opts.onSourceMode) opts.onSourceMode(data.mode)
  })
  es.addEventListener('snapshot', (e) => {
    const data = safeJson(/** @type {MessageEvent} */(e).data)
    if (data && Array.isArray(data.services) && opts.onSnapshot) {
      opts.onSnapshot(data.services)
    }
  })
  es.addEventListener('change', (e) => {
    const data = safeJson(/** @type {MessageEvent} */(e).data)
    if (data && Array.isArray(data.diffs) && opts.onChange) {
      opts.onChange(data.diffs)
    }
  })
  es.onerror = (err) => {
    if (firstError) {
      logger.warn('SSE connection error (browser will retry):', err)
      firstError = false
    }
    if (opts.onError) opts.onError(err)
  }

  return () => {
    try { es.close() } catch { /* ignore */ }
  }
}
