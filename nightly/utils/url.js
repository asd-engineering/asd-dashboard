// @ts-check
/**
 * Helper utilities for reading and manipulating URL search parameters.
 *
 * @module url
 */

/**
 * Retrieve import-related flags from the current URL.
 *
 * @function getImportFlags
 * @returns {{isImport:boolean, importName:string}}
 */
export function getImportFlags () {
  const params = new URLSearchParams(location.search)
  const isImport = params.get('import') === 'true'
  const importName = (params.get('import_name') || '').trim()
  return { isImport, importName }
}

/**
 * Remove import-related flags from the URL without reloading the page.
 * Other query parameters remain untouched.
 *
 * @function removeImportFlagsFromUrl
 * @returns {void}
 */
export function removeImportFlagsFromUrl () {
  const params = new URLSearchParams(location.search)
  let mutated = false
  if (params.has('import')) { params.delete('import'); mutated = true }
  if (params.has('import_name')) { params.delete('import_name'); mutated = true }
  if (!mutated) return

  const search = params.toString()
  const newUrl = `${location.pathname}${search ? `?${search}` : ''}${location.hash || ''}`
  window.history.replaceState(null, '', newUrl)
}
