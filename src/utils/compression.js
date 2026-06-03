// @ts-check
/**
 * Utility functions for compressing and encoding data for URL fragments.
 *
 * @module compression
 */

import { applyKeyMap } from './keymap.js'
import { computeCRC32Hex } from './checksum.js'

/**
 * Base64url encode a byte array.
 *
 * @function base64UrlEncode
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function base64UrlEncode (bytes) {
  let binary = ''
  bytes.forEach(b => { binary += String.fromCharCode(b) })
  const b64 = typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decode a base64url string to bytes.
 *
 * @function base64UrlDecode
 * @param {string} str
 * @returns {Uint8Array}
 */
export function base64UrlDecode (str) {
  const pad = '===='.slice(0, (4 - str.length % 4) % 4)
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad
  const binary = typeof atob === 'function'
    ? atob(b64)
    : Buffer.from(b64, 'base64').toString('binary')
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Compress a UTF-8 string using a built-in algorithm.
 * Falls back to Node's zlib when CompressionStream is unavailable.
 *
 * @param {string} text
 * @param {'gzip'|'deflate'} algo
 * @returns {Promise<Uint8Array>}
 */
async function compressString (text, algo) {
  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream(algo)
    const stream = new Blob([text]).stream().pipeThrough(cs)
    const buffer = await new Response(stream).arrayBuffer()
    return new Uint8Array(buffer)
  }
  const zlib = await import('zlib')
  return algo === 'deflate'
    ? zlib.deflateRawSync(Buffer.from(text))
    : zlib.gzipSync(Buffer.from(text))
}

/**
 * Decompress a byte array into a UTF-8 string.
 * Falls back to Node's zlib when DecompressionStream is unavailable.
 *
 * @param {Uint8Array} bytes
 * @param {'gzip'|'deflate'} algo
 * @returns {Promise<string>}
 */
async function decompressToString (bytes, algo) {
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream(algo)
    const blobBytes = /** @type {BlobPart} */ (bytes)
    const stream = new Blob([blobBytes]).stream().pipeThrough(ds)
    return await new Response(stream).text()
  }
  const zlib = await import('zlib')
  return algo === 'deflate'
    ? zlib.inflateRawSync(Buffer.from(bytes)).toString()
    : zlib.gunzipSync(Buffer.from(bytes)).toString()
}

/**
 * Encode an object to a base64url string with optional minification and checksum.
 *
 * @function encodeConfig
 * @param {any} obj
 * @param {{algo?: 'gzip'|'deflate', keyMap?: Record<string,string>|null, withChecksum?: boolean}} [opts]
 * @returns {Promise<{data:string, checksum?:string}>}
 */
export async function encodeConfig (obj, opts = {}) {
  const algo = opts.algo ?? 'gzip'
  const map = opts.keyMap ?? null
  const withChecksum = Boolean(opts.withChecksum)

  const toEncode = map ? applyKeyMap(obj, map, 'encode') : obj
  const json = JSON.stringify(toEncode)
  const checksum = withChecksum ? computeCRC32Hex(json) : undefined
  const bytes = await compressString(json, algo)
  const data = base64UrlEncode(bytes)
  return { data, checksum }
}

/**
 * Decode a base64url string into an object, verifying checksum and applying key map.
 *
 * @function decodeConfig
 * @param {string} str
 * @param {{algo?: 'gzip'|'deflate', keyMap?: Record<string,string>|null, expectChecksum?: string|null}} [opts]
 * @returns {Promise<any>}
 */
export async function decodeConfig (str, opts = {}) {
  const algo = opts.algo ?? 'gzip'
  const map = opts.keyMap ?? null
  const expectChecksum = opts.expectChecksum ?? null

  const bytes = base64UrlDecode(str)
  const json = await decompressToString(bytes, algo)

  if (expectChecksum) {
    const got = computeCRC32Hex(json)
    if (got !== expectChecksum) {
      throw new Error(`Checksum mismatch (expected ${expectChecksum}, got ${got})`)
    }
  }

  const parsed = JSON.parse(json)
  return map ? applyKeyMap(parsed, map, 'decode') : parsed
}

/**
 * Gzip a JavaScript object and encode it as base64url.
 * Backwards-compatible wrapper.
 *
 * @function gzipJsonToBase64url
 * @param {object} obj
 * @returns {Promise<string>}
 */
export async function gzipJsonToBase64url (obj) {
  const { data } = await encodeConfig(obj, { algo: 'gzip', withChecksum: false })
  return data
}

/**
 * Decode and gunzip a base64url string to a JavaScript object.
 * Backwards-compatible wrapper.
 *
 * @function gunzipBase64urlToJson
 * @param {string} str
 * @returns {Promise<any>}
 */
export async function gunzipBase64urlToJson (str) {
  return await decodeConfig(str, { algo: 'gzip' })
}

export default {
  base64UrlEncode,
  base64UrlDecode,
  encodeConfig,
  decodeConfig,
  gzipJsonToBase64url,
  gunzipBase64urlToJson
}
