// @ts-check
/**
 * Simple JSON helpers with stable stringify.
 * @module storage/jsonUtil
 */

/**
 * Safely parse a JSON string.
 * @function safeParse
 * @param {string|null} json
 * @param {any} fallback
 * @returns {any}
 */
export function safeParse (json, fallback) {
  try {
    return json ? JSON.parse(json) : fallback
  } catch {
    return fallback
  }
}

/**
 * Stable stringify (keys sorted) for deterministic storage/debug.
 * @function stableStringify
 * @param {any} value
 * @returns {string}
 */
export function stableStringify (value) {
  const seen = new WeakSet()
  return JSON.stringify(value, function replacer (k, v) {
    if (v && typeof v === 'object') {
      if (seen.has(v)) return
      seen.add(v)
      if (!Array.isArray(v)) {
        return Object.keys(v).sort().reduce((o, key) => { o[key] = v[key]; return o }, {})
      }
    }
    return v
  })
}
