// @ts-check
/** @module utils/hash */

/**
 * Compute MD5 digest hex string.
 * @function md5Hex
 * @param {string} str
 * @returns {string}
 */
export function md5Hex (str) {
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296))
  const x = []
  for (let i = 0; i < str.length; i++) x[i >> 2] |= str.charCodeAt(i) << ((i % 4) << 3)
  x[str.length >> 2] |= 0x80 << ((str.length % 4) << 3)
  x[(str.length + 8 >> 6 << 4) + 14] = str.length * 8
  let a = 0x67452301; let b = 0xefcdab89; let c = 0x98badcfe; let d = 0x10325476
  for (let i = 0; i < x.length; i += 16) {
    const A = a; const B = b; const C = c; const D = d
    for (let j = 0; j < 64; j++) {
      let f; let g; const div = j >> 4
      if (div === 0) { f = (b & c) | (~b & d); g = j } else if (div === 1) { f = (d & b) | (c & ~d); g = (5 * j + 1) % 16 } else if (div === 2) { f = b ^ c ^ d; g = (3 * j + 5) % 16 } else { f = c ^ (b | ~d); g = (7 * j) % 16 }
      const t = a + f + K[j] + (x[i + g] | 0)
      a = d; d = c; c = b
      b = b + ((t << S[(div << 2) + (j & 3)]) | (t >>> 32 - S[(div << 2) + (j & 3)])) | 0
    }
    a = a + A | 0; b = b + B | 0; c = c + C | 0; d = d + D | 0
  }
  return [a, b, c, d].map(n => (n >>> 0).toString(16).padStart(8, '0')).join('')
}
