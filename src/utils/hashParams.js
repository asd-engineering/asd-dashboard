// @ts-check
/**
 * Helpers for manipulating the URL hash without losing the session prefix.
 *
 * @module hashParams
 */

/**
 * Update the hash parameters while preserving the `#local:<id>` prefix.
 *
 * @param {string} oldHash - Existing location hash.
 * @param {Object<string,string>} newParams - Parameters to apply.
 * @function changeUrlParams
 * @returns {string}
 */
export function changeUrlParams (oldHash, newParams) {
  const match = oldHash.match(/^#local:([\w-]+)(.*)$/)
  const id = match ? match[1] : ''
  const suffix = match ? match[2] : oldHash.replace(/^#/, '')
  const params = new URLSearchParams(suffix.startsWith('&') ? suffix.slice(1) : suffix)
  for (const [key, value] of Object.entries(newParams)) {
    params.set(key, value)
  }
  const query = params.toString()
  return `#local:${id}${query ? '&' + query : ''}`
}
