// @ts-check
/**
 * Utility functions for gzip compression and base64url encoding.
 *
 * @module compression
 */

/**
 * Base64url encode a byte array.
 *
 * @function base64UrlEncode
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function base64UrlEncode (bytes) {
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
function base64UrlDecode (str) {
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
 * Gzip a JavaScript object and encode it as base64url.
 *
 * @function gzipJsonToBase64url
 * @param {object} obj
 * @returns {Promise<string>}
 */
export async function gzipJsonToBase64url (obj) {
  const json = JSON.stringify(obj)
  let bytes
  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('gzip')
    const stream = new Blob([json]).stream().pipeThrough(cs)
    const buffer = await new Response(stream).arrayBuffer()
    bytes = new Uint8Array(buffer)
  } else {
    const zlib = await import('zlib')
    bytes = zlib.gzipSync(Buffer.from(json))
  }
  return base64UrlEncode(bytes)
}

/**
 * Decode and gunzip a base64url string to a JavaScript object.
 *
 * @function gunzipBase64urlToJson
 * @param {string} str
 * @returns {Promise<object>}
 */
export async function gunzipBase64urlToJson (str) {
  const bytes = base64UrlDecode(str)
  let text
  if (typeof DecompressionStream !== 'undefined') {
    const ds = new DecompressionStream('gzip')
    const stream = new Blob([bytes]).stream().pipeThrough(ds)
    text = await new Response(stream).text()
  } else {
    const zlib = await import('zlib')
    text = zlib.gunzipSync(Buffer.from(bytes)).toString()
  }
  return JSON.parse(text)
}

/**
 * Convenience wrapper for encoding dashboard configuration objects.
 *
 * @function encodeConfig
 * @param {object} cfg
 * @returns {Promise<string>}
 */
export const encodeConfig = gzipJsonToBase64url

/**
 * Convenience wrapper for decoding dashboard configuration objects.
 *
 * @function decodeConfig
 * @param {string} str
 * @returns {Promise<object>}
 */
export const decodeConfig = gunzipBase64urlToJson
