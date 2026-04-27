// @ts-check
/**
 * Tiny client for the MCP tmux endpoints surfaced under /asde/mcp/.
 *
 * The dashboard runs at /asde/dashboard/ behind the same Caddy basic-auth
 * realm as MCP, so the browser auto-attaches credentials on these
 * same-origin POSTs — no manual Authorization header needed.
 *
 * Endpoints (added in modules/mcp/scripts/serve.mjs):
 *   POST /asde/mcp/tmux.list      → { ok, sessions: string[] }
 *   POST /asde/mcp/tmux.kill      → { ok, killed: string|null }     body: { id }
 *   POST /asde/mcp/tmux.kill-all  → { ok, killed: number }
 *
 * All responses from this module are tagged with a `status` field so
 * callers can distinguish "MCP unreachable" from "no sessions" — they
 * collapsed to the same `[]` previously, which silently hid backend
 * failures behind an empty Shells panel.
 *
 * @module runtime/shellsClient
 */

const BASE = '/asde/mcp'

/**
 * @typedef {Object} ListResult
 * @property {'ok'|'error'} status
 * @property {string[]} sessions
 * @property {string} [errorReason] - 'network'|'unauthorized'|'server-error'|'parse'
 */

/**
 * Fetch the list of asd-* tmux session ids (prefix stripped server-side).
 *
 * On error, sessions=[] AND status='error' with an errorReason — the UI
 * uses status to decide whether to show an "MCP unreachable" banner vs
 * a healthy "no shells running" empty state.
 *
 * @returns {Promise<ListResult>}
 */
export async function listShellSessions () {
  let res
  try {
    res = await fetch(`${BASE}/tmux.list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      credentials: 'include'
    })
  } catch (err) {
    return { status: 'error', sessions: [], errorReason: 'network' }
  }
  if (res.status === 401 || res.status === 403) {
    return { status: 'error', sessions: [], errorReason: 'unauthorized' }
  }
  if (!res.ok) {
    return { status: 'error', sessions: [], errorReason: 'server-error' }
  }
  try {
    const data = await res.json()
    return { status: 'ok', sessions: Array.isArray(data?.sessions) ? data.sessions : [] }
  } catch {
    return { status: 'error', sessions: [], errorReason: 'parse' }
  }
}

/**
 * @typedef {Object} KillResult
 * @property {boolean} ok
 * @property {string|null} killed - The full asd-<id> name on success.
 * @property {string} [errorReason] - 'network'|'unauthorized'|'no-session'|'server-error'
 */

/**
 * Kill one session by id (no `asd-` prefix — server prepends).
 * @param {string} id
 * @returns {Promise<KillResult>}
 */
export async function killShellSession (id) {
  let res
  try {
    res = await fetch(`${BASE}/tmux.kill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      credentials: 'include'
    })
  } catch {
    return { ok: false, killed: null, errorReason: 'network' }
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, killed: null, errorReason: 'unauthorized' }
  }
  if (!res.ok) {
    return { ok: false, killed: null, errorReason: 'server-error' }
  }
  try {
    const data = await res.json()
    if (data?.ok) return { ok: true, killed: data.killed ?? null }
    // Server returned ok:false — most often "no such session" (idempotent
    // kill or external race). Surface as no-session so toast text reads
    // accurately rather than implying a real failure.
    return { ok: false, killed: null, errorReason: 'no-session' }
  } catch {
    return { ok: false, killed: null, errorReason: 'server-error' }
  }
}

/**
 * @typedef {Object} KillAllResult
 * @property {boolean} ok
 * @property {number} killed
 * @property {string} [errorReason]
 */

/**
 * Kill every asd-* session.
 * @returns {Promise<KillAllResult>}
 */
export async function killAllShellSessions () {
  let res
  try {
    res = await fetch(`${BASE}/tmux.kill-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      credentials: 'include'
    })
  } catch {
    return { ok: false, killed: 0, errorReason: 'network' }
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, killed: 0, errorReason: 'unauthorized' }
  }
  if (!res.ok) {
    return { ok: false, killed: 0, errorReason: 'server-error' }
  }
  try {
    const data = await res.json()
    return { ok: Boolean(data?.ok), killed: Number(data?.killed || 0) }
  } catch {
    return { ok: false, killed: 0, errorReason: 'server-error' }
  }
}

/**
 * The dashboard's "attach" entry point: the URL ttyd should be navigated
 * to. ttyd's url-arg mode appends these to the wrapper, the wrapper
 * resolves --target=<id> and re-attaches to the tmux session.
 * @param {string} id
 * @returns {string}
 */
export function attachUrlFor (id) {
  // ttyd parses `?arg=...&arg=...` — the wrapper sees `--target=<id>` and
  // exec's `tmux attach-session -t asd-<id>`.
  const params = new URLSearchParams()
  params.append('arg', `--target=${id}`)
  return `/asde/terminal/?${params.toString()}`
}

/**
 * The "+ New Shell" entry point: fresh tmux session named with a timestamp
 * so it's reattachable later from the panel.
 * @param {string} [seed] - Optional id seed; defaults to timestamp-based.
 * @returns {{ url: string, sessionId: string }}
 */
export function newShellUrl (seed) {
  const ts = Date.now().toString(36)
  // Keep id readable; only [a-zA-Z0-9_.:-] survive the wrapper sanitizer.
  const sessionId = (seed || `shell-${ts}`).replace(/[^a-zA-Z0-9_.:-]/g, '-').replace(/^-+|-+$/g, '') || `shell-${ts}`
  const params = new URLSearchParams()
  params.append('arg', `--session=${sessionId}`)
  // No --trailer-file: that would force the direct-exec branch and skip
  // tmux. We want a reattachable shell, so the wrapper takes the tmux path.
  params.append('arg', 'bash')
  params.append('arg', '-i')
  return { url: `/asde/terminal/?${params.toString()}`, sessionId }
}
