// @ts-check
/**
 * CRC32 checksum utilities.
 *
 * @module checksum
 */

/** @type {Uint32Array|null} */
let table = null

/**
 * Build CRC32 lookup table on first use.
 *
 * @returns {Uint32Array}
 */
function makeTable () {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c >>> 0
  }
  return t
}

/**
 * Compute the CRC32 of a string.
 *
 * @function computeCRC32
 * @param {string} s
 * @returns {number}
 */
export function computeCRC32 (s) {
  if (!table) table = makeTable()
  let crc = 0 ^ 0xffffffff
  for (let i = 0; i < s.length; i++) {
    const byte = s.charCodeAt(i) & 0xff
    crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Compute CRC32 and return zero-padded hex.
 *
 * @function computeCRC32Hex
 * @param {string} s
 * @returns {string}
 */
export function computeCRC32Hex (s) {
  return computeCRC32(s).toString(16).padStart(8, '0')
}

export default { computeCRC32, computeCRC32Hex }
