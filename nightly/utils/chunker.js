// @ts-check
/**
 * Deterministic splitter/joiner for long fragment parameters.
 *
 * @module chunker
 */

/**
 * Split a string into URL fragment parameters, adding numeric suffixes when needed.
 *
 * @function splitIntoParams
 * @param {string} name
 * @param {string} data
 * @param {number} maxLen
 * @returns {Array<[string,string]>}
 */
export function splitIntoParams (name, data, maxLen) {
  if (data.length <= maxLen) return [[name, data]]
  /** @type {Array<[string,string]>} */
  const out = []
  let i = 0
  for (let off = 0; off < data.length; off += maxLen) {
    const part = data.slice(off, off + maxLen)
    out.push([`${name}${i}`, part])
    i++
  }
  return out
}

/**
 * Join numbered fragment parameters back into a single string.
 *
 * @function joinFromParams
 * @param {string} name
 * @param {URLSearchParams} params
 * @returns {string|null}
 */
export function joinFromParams (name, params) {
  const single = params.get(name)
  if (single) return single

  /** @type {Array<[number,string]>} */
  const parts = []
  for (const [k, v] of params.entries()) {
    if (k.startsWith(name)) {
      const idx = Number(k.slice(name.length))
      if (Number.isInteger(idx)) parts.push([idx, v])
    }
  }
  if (parts.length === 0) return null
  parts.sort((a, b) => a[0] - b[0])
  return parts.map(([, v]) => v).join('')
}

/**
 * Parse a chunk manifest string like "cfg:3;svc:2".
 *
 * @function parseChunksManifest
 * @param {string} s
 * @returns {Record<string,number>}
 */
export function parseChunksManifest (s) {
  /** @type {Record<string, number>} */ const out = {}
  if (!s) return out
  for (const seg of s.split(';')) {
    const [k, v] = seg.split(':')
    if (!k) continue
    const n = Number(v)
    if (Number.isFinite(n) && n >= 0) out[k] = n
  }
  return out
}

/**
 * Format a chunk manifest object to a string.
 *
 * @function formatChunksManifest
 * @param {Record<string,number>} m
 * @returns {string}
 */
export function formatChunksManifest (m) {
  return Object.entries(m)
    .filter(([, n]) => Number.isFinite(n) && n > 0)
    .map(([k, n]) => `${k}:${n}`)
    .join(';')
}
