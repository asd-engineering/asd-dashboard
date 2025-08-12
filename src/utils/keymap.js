// @ts-check
/**
 * Reversible key-map utility.
 *
 * @module keymap
 */

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * Invert a flat key map.
 *
 * @param {Record<string,string>} map
 * @returns {Record<string,string>}
 */
function invert (map) {
  /** @type {Record<string,string>} */
  const inv = {}
  for (const key of Object.keys(map)) {
    inv[map[key]] = key
  }
  return inv
}

/**
 * Recursively apply a key map in the specified direction.
 *
 * @function applyKeyMap
 * @param {any} value
 * @param {Record<string,string>} map
 * @param {'encode'|'decode'} direction
 * @returns {any}
 */
export function applyKeyMap (value, map, direction) {
  const m = direction === 'encode' ? map : invert(map)
  const walk = node => {
    if (Array.isArray(node)) return node.map(walk)
    if (!isObject(node)) return node
    /** @type {Record<string, any>} */
    const out = {}
    for (const [k, v] of Object.entries(node)) {
      const nk = m[k] ?? k
      out[nk] = walk(v)
    }
    return out
  }
  return walk(value)
}

export default { applyKeyMap }
