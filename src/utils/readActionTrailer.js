// @ts-check
/**
 * Read an ttyd-shell action trailer JSON.
 *
 * The .asd ttyd-shell wrapper writes `{ok, exit_code, duration_ms, argv,
 * session_id}` to `workspace/action-trailers/<session-id>.json` when
 * invoked with `--trailer-file=...`. Caddy serves the workspace under
 * `/asde/action-trailers/`.
 *
 * @module utils/readActionTrailer
 */

/** @typedef {{ok: boolean, exit_code: number, duration_ms: number, argv?: string[]|string, session_id?: string}} ActionTrailer */

/**
 * Fetch the action trailer for a session id.
 *
 * @param {string} sessionId - e.g. "ttyd-stop"
 * @param {string} [originUrl] - defaults to window.location.origin
 * @returns {Promise<ActionTrailer | null>} null when 404 or fetch fails.
 */
export async function readActionTrailer (sessionId, originUrl) {
  const origin = originUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  if (!sessionId) return null
  const url = `${origin}/asde/action-trailers/${encodeURIComponent(sessionId)}.json`
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) return null
    return /** @type {any} */(await r.json())
  } catch {
    return null
  }
}
