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
 * @returns {Promise<void>}
 */
/**
 * Load config/services from URL fragment into localStorage.
 *
 * @param {boolean} [wasExplicitLoad=false] - Skip guard when true.
 * @returns {Promise<void>}
 */
export async function loadFromFragment (wasExplicitLoad = false) {
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
  const nameParam = params.get('name') || 'Imported'

  const hasLocalData =
    StorageManager.getConfig() ||
    StorageManager.getServices().length > 0 ||
    (Array.isArray(StorageManager.getConfig().boards) && StorageManager.getConfig().boards.length > 0)

  if ((cfgParam || svcParam) && hasLocalData && !wasExplicitLoad) {
    await openFragmentDecisionModal({ cfgParam, svcParam, nameParam })
    return
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
}
