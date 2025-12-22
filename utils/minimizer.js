// @ts-check
/**
 * Schema-aware, reversible minimizer for dashboard payloads.
 * Drops fields equal to provided defaults and optionally prunes empty values.
 *
 * @module minimizer
 */

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * Recursively prune defaults and empties from a value.
 *
 * @function minimizeDeep
 * @param {any} value
 * @param {any} defaults
 * @param {{ dropEmpties?: boolean }} [opts]
 * @returns {any}
 */
export function minimizeDeep (value, defaults, opts = {}) {
  const dropEmpties = !!opts.dropEmpties

  if (!isObj(value)) {
    if (value === defaults) return undefined
    if (dropEmpties && (value === '' || value === null)) return undefined
    return value
  }

  if (Array.isArray(value)) {
    const out = value
      .map((el, i) => minimizeDeep(el, Array.isArray(defaults) ? defaults[i] : undefined, opts))
      .filter((el) => !(dropEmpties && (el === undefined || el === null || (Array.isArray(el) && el.length === 0))))
    return (dropEmpties && out.length === 0) ? undefined : out
  }

  /** @type {Record<string, any>} */
  const out = {}
  let kept = 0
  for (const [k, v] of Object.entries(value)) {
    const def = isObj(defaults) ? defaults[k] : undefined
    if (def === undefined && !(k in (defaults || {}))) {
      out[k] = v
      kept++
      continue
    }
    const pruned = minimizeDeep(v, def, opts)
    if (pruned !== undefined) {
      out[k] = pruned
      kept++
    }
  }
  if (kept === 0 && dropEmpties) return undefined
  return out
}

/**
 * Restore pruned values by filling defaults for missing keys.
 *
 * @function restoreDeep
 * @param {any} minimized
 * @param {any} defaults
 * @returns {any}
 */
export function restoreDeep (minimized, defaults) {
  if (!isObj(defaults)) return minimized ?? defaults

  if (Array.isArray(defaults)) {
    if (!Array.isArray(minimized)) return defaults
    const maxLen = Math.max(minimized.length, defaults.length)
    const out = new Array(maxLen)
    for (let i = 0; i < maxLen; i++) {
      out[i] = restoreDeep(minimized[i], defaults[i])
    }
    return out
  }

  /** @type {Record<string, any>} */
  const out = {}
  const keys = new Set([...Object.keys(defaults || {}), ...Object.keys(minimized || {})])
  for (const k of keys) {
    out[k] = restoreDeep(minimized?.[k], defaults?.[k])
  }
  return out
}
