// @ts-check
/**
 * Service state bus.
 *
 * Subscribes to the MCP `/api/state/stream` SSE endpoint and keeps
 * `StorageManager.services` in sync. On each `change` event, dispatches
 * a `service-state-changed` DOM event so widgets can re-render their
 * offline overlays in place — no page reload, no widget recreation.
 *
 * Falls back to a 5s `/api/services` poll if SSE never connects.
 *
 * @module utils/serviceStateBus
 */
import { Logger } from './Logger.js'
import { StorageManager } from '../storage/StorageManager.js'
import { subscribeServiceState } from './streamServiceState.js'

const logger = new Logger('serviceStateBus.js')

const POLL_INTERVAL_MS = 5000

/** @type {(() => void) | null} */
let unsubscribe = null
/** @type {ReturnType<typeof setInterval> | null} */
let pollTimer = null
let started = false

/**
 * Resolve the MCP base URL.
 *
 * Same-origin by default — Caddy proxies `/api/*` → MCP (see
 * `modules/dashboard/net.manifest.yaml`). Single front-door, no CORS,
 * no second URL for the browser to discover. `window.__ASD_MCP_URL__`
 * is an escape hatch for tests and dev.
 *
 * @returns {string}
 */
function resolveMcpUrl () {
  if (typeof window !== 'undefined' && /** @type {any} */(window).__ASD_MCP_URL__) {
    return /** @type {any} */(window).__ASD_MCP_URL__
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

/**
 * Apply per-service diffs to StorageManager and notify widgets.
 *
 * @param {Array<{id: string, from: string, to: string}>} diffs
 */
function applyDiffs (diffs) {
  if (!Array.isArray(diffs) || diffs.length === 0) return
  const services = StorageManager.getServices().map((s) => {
    const d = diffs.find((x) => x.id === s.id)
    return d ? { ...s, state: d.to } : s
  })
  StorageManager.setServices(services)
  document.dispatchEvent(new CustomEvent('service-state-changed', { detail: { diffs } }))
}

/**
 * Replace local service state with a snapshot.
 *
 * @param {Array<{id: string, status?: string, state?: string}>} snapshot
 */
function applySnapshot (snapshot) {
  if (!Array.isArray(snapshot)) return
  const current = StorageManager.getServices()
  const diffs = []
  const next = current.map((s) => {
    const fresh = snapshot.find((x) => x.id === s.id)
    if (!fresh) return s
    const newState = fresh.status || fresh.state || s.state
    if (newState && newState !== s.state) {
      diffs.push({ id: s.id, from: String(s.state || ''), to: String(newState) })
    }
    return { ...s, state: newState || s.state }
  })
  StorageManager.setServices(next)
  if (diffs.length > 0) {
    document.dispatchEvent(new CustomEvent('service-state-changed', { detail: { diffs } }))
  }
}

/**
 * Start the /api/services polling fallback.
 *
 * @param {string} baseUrl
 */
function startPoll (baseUrl) {
  if (pollTimer) return
  const fetchOnce = async () => {
    try {
      const r = await fetch(`${baseUrl}/api/services`)
      if (!r.ok) return
      const body = await r.json()
      if (Array.isArray(body.services)) applySnapshot(body.services)
    } catch {
      // MCP not reachable — silent; next tick will retry.
    }
  }
  fetchOnce().catch(() => { /* silent — next tick retries */ })
  pollTimer = setInterval(fetchOnce, POLL_INTERVAL_MS)
}

/**
 * Start the service state bus. Idempotent.
 *
 * @returns {void}
 */
export function startServiceStateBus () {
  if (started) return
  started = true

  const baseUrl = resolveMcpUrl()
  let pollStarted = false

  unsubscribe = subscribeServiceState({
    baseUrl,
    onSnapshot: applySnapshot,
    onChange: applyDiffs,
    onSourceMode: (mode) => logger.log(`SSE source mode: ${mode}`),
    onError: () => {
      // Fall back to polling if SSE never recovers.
      // EventSource keeps reconnecting in the background; both run together
      // until an SSE event arrives (then the snapshot/diff path catches up).
      if (!pollStarted) {
        pollStarted = true
        logger.warn('SSE failed; starting /api/services polling fallback')
        startPoll(baseUrl)
      }
    }
  })
}

/**
 * Stop the service state bus.
 *
 * @returns {void}
 */
export function stopServiceStateBus () {
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  started = false
}
