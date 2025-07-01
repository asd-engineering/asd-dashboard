// @ts-check
/**
 * Remove any `#cfg` or `#svc` fragment from the current URL without triggering
 * a reload.
 *
 * @function clearConfigFragment
 * @returns {void}
 */
export function clearConfigFragment () {
  if (location.hash.includes('cfg=') || location.hash.includes('svc=')) {
    window.history.replaceState(null, '', location.pathname + location.search)
    console.info('🔁 Cleared #cfg/#svc fragment from URL to prevent stale overwrite')
  }
}
