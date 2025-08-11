// @ts-check
/**
 * Load dashboard configuration and services from the URL fragment.
 *
 * Format: #cfg=<gzip+base64url>&svc=<gzip+base64url>
 *
 * @module fragmentLoader
 */

import { Logger } from './Logger.js'
import { showNotification } from '../component/dialog/notification.js'
import { gunzipBase64urlToJson } from './compression.js'
import { openFragmentDecisionModal } from '../component/modal/fragmentDecisionModal.js'
import StorageManager from '../storage/StorageManager.js'

const logger = new Logger('fragmentLoader.js')

/**
 * Parse the URL fragment and store config/services in localStorage.
 * Logs info on success and alerts on failure.
 *
 * @function loadFromFragment
 * @returns {Promise<{cfg:string|null,svc:string|null,name:string}>}
 */
/**
 * Load config/services from URL fragment into localStorage.
 *
 * @param {boolean} [wasExplicitLoad=false] - Skip guard when true.
 * @returns {Promise<{cfg:string|null,svc:string|null,name:string}>}
 */
export async function loadFromFragment (wasExplicitLoad = false) {
  // Test instrumentation: count fragment loads to detect duplicate invocations.
  // @ts-ignore
  window.__fragmentLoadCount = (window.__fragmentLoadCount || 0) + 1
  if (!('DecompressionStream' in window)) {
    if (location.hash.includes('cfg=') || location.hash.includes('svc=')) {
      showNotification('⚠️ DecompressionStream niet ondersteund door deze browser.', 4000, 'error')
    }
    logger.warn('DecompressionStream niet ondersteund, fragment loader wordt overgeslagen.')
    return
  }

  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : ''
  const params = new URLSearchParams(hash)
  const cfgParam = params.get('cfg')
  const svcParam = params.get('svc')
  let nameParam = params.get('name') || 'Imported'

  if (wasExplicitLoad) {
    const searchParams = new URLSearchParams(location.search)
    const explicitName = searchParams.get('import_name')
    if (explicitName) nameParam = explicitName
  }

  const hasLocalData =
    StorageManager.getConfig() ||
    StorageManager.getServices().length > 0 ||
    (Array.isArray(StorageManager.getConfig().boards) && StorageManager.getConfig().boards.length > 0)

  if ((cfgParam || svcParam) && hasLocalData && !wasExplicitLoad) {
    await openFragmentDecisionModal({ cfgParam, svcParam, nameParam })
    // Return shape mirrors explicit loads; callers typically ignore this branch.
    return { cfg: cfgParam, svc: svcParam, name: nameParam }
  }

  try {
    if (cfgParam) {
      const cfg = await gunzipBase64urlToJson(cfgParam)
      StorageManager.setConfig(cfg)
      logger.info('✅ Config geladen uit fragment')
    }

    if (svcParam) {
      const svc = await gunzipBase64urlToJson(svcParam)
      StorageManager.setServices(svc)
      logger.info('✅ Services geladen uit fragment')
    }
  } catch (e) {
    logger.error('❌ Fout bij laden uit fragment:', e)
    showNotification('Fout bij laden van dashboardconfiguratie uit URL fragment.', 4000, 'error')
  }

  return { cfg: cfgParam, svc: svcParam, name: nameParam }
}
