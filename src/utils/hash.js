// @ts-check
/** @module utils/hash */
/**
 * Compute MD5 hex digest of a string.
 * @function md5Hex
 * @param {string} str
 * @returns {string}
 */
export function md5Hex (str) {
  const k = []; const s = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21]
  for (let i = 0; i < 64; i++) k[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32)
  const x = []
  for (let i = 0; i < str.length; i++) x[i >> 2] |= str.charCodeAt(i) << ((i % 4) << 3)
  x[str.length >> 2] |= 0x80 << ((str.length % 4) << 3)
  x[((str.length + 8 >> 6) << 4) + 14] = str.length * 8
  let a = 0x67452301; let b = 0xefcdab89; let c = 0x98badcfe; let d = 0x10325476
  for (let i = 0; i < x.length; i += 16) {
    const A = a; const B = b; const C = c; const D = d
    for (let j = 0; j < 64; j++) {
      let f, g
      if (j < 16) { f = (b & c) | (~b & d); g = j } else if (j < 32) { f = (d & b) | (~d & c); g = (5 * j + 1) % 16 } else if (j < 48) { f = b ^ c ^ d; g = (3 * j + 5) % 16 } else { f = c ^ (b | ~d); g = (7 * j) % 16 }
      const w = (a + f + k[j] + (x[i + g] | 0)) | 0; const rot = s[(j % 4) + (j >> 4) * 4]
      a = d; d = c; c = b; b = (b + ((w << rot) | (w >>> 32 - rot))) | 0
    }
    a = (a + A) | 0; b = (b + B) | 0; c = (c + C) | 0; d = (d + D) | 0
  }
  return [a, b, c, d].map(n => ('00000000' + (n >>> 0).toString(16)).slice(-8)).join('')
}
