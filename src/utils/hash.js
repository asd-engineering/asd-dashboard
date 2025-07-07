// @ts-check
/** @module utils/hash */
import SparkMD5 from 'spark-md5'

/**
 * Returns a 32-digit MD5 hex string for UTF-8 text input.
 * @param {string} str
 * @returns {string}
 */
export function md5Hex (str) {
  return SparkMD5.hash(str)
}

/**
 * Returns a 32-digit MD5 hex string for binary data (e.g. gzipped payloads).
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function md5Buffer (buffer) {
  return SparkMD5.ArrayBuffer.hash(buffer)
}
