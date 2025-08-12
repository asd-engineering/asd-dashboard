// @ts-check
/**
 * Shared constants and feature flags for URL fragment handling.
 * Values can be overridden via environment variables at build time.
 *
 * @module fragmentConstants
 */

const env = typeof process !== 'undefined' && process && process.env ? process.env : {}

/**
 * Default compression algorithm for fragment exports.
 *
 * @type {'deflate'|'gzip'}
 */
export const FRAG_DEFAULT_ALGO = env.FRAG_DEFAULT_ALGO === 'gzip' ? 'gzip' : 'deflate'

/**
 * Toggle minimization of config/services during export/import.
 * Set `FRAG_MINIMIZE_ENABLED=false` to disable.
 *
 * @type {boolean}
 */
export const FRAG_MINIMIZE_ENABLED = env.FRAG_MINIMIZE_ENABLED !== 'false'

/**
 * Maximum length per fragment parameter before chunking is applied.
 * Set `FRAG_CHUNK_MAX_LEN=0` to disable chunking.
 *
 * @type {number}
 */
export const FRAG_CHUNK_MAX_LEN = (() => {
  const n = Number(env.FRAG_CHUNK_MAX_LEN)
  return Number.isFinite(n) && n > 0 ? n : Infinity
})()

/**
 * URL length threshold after which a warning is shown.
 *
 * @type {number}
 */
export const FRAG_WARN_URL_LEN = (() => {
  const n = Number(env.FRAG_WARN_URL_LEN)
  return Number.isFinite(n) && n > 0 ? n : 60000
})()
