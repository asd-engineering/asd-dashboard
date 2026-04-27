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
 * @module runtime/shellsClient
 */

const BASE = '/asde/mcp'

/**
 * Fetch the list of asd-* tmux session ids (prefix stripped server-side).
 * Network errors resolve to an empty list — Shells tab tolerates a missing
 * MCP and just shows nothing rather than throwing in the UI.
 * @returns {Promise<string[]>}
 */
export async function listShellSessions () {
  try {
    const res = await fetch(`${BASE}/tmux.list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      credentials: 'include'
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data?.sessions) ? data.sessions : []
  } catch {
    return []
  }
}

/**
 * Kill one session by id (no `asd-` prefix — server prepends).
 * @param {string} id
 * @returns {Promise<{ok:boolean,killed:string|null}>}
 */
export async function killShellSession (id) {
  try {
    const res = await fetch(`${BASE}/tmux.kill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      credentials: 'include'
    })
    if (!res.ok) return { ok: false, killed: null }
    return await res.json()
  } catch {
    return { ok: false, killed: null }
  }
}

/**
 * Kill every asd-* session.
 * @returns {Promise<{ok:boolean,killed:number}>}
 */
export async function killAllShellSessions () {
  try {
    const res = await fetch(`${BASE}/tmux.kill-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      credentials: 'include'
    })
    if (!res.ok) return { ok: false, killed: 0 }
    return await res.json()
  } catch {
    return { ok: false, killed: 0 }
  }
}

/**
 * The dashboard's "attach" entry point: navigates to the ttyd terminal with
 * the --target argv. ttyd's url-arg mode appends these to the wrapper, the
 * wrapper resolves --target=<id> and re-attaches to the tmux session.
 * Path is the same hub-relative URL the Start/Stop buttons already use.
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
