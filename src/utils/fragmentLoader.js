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

  const hasLocalData =
    localStorage.getItem('config') ||
    localStorage.getItem('services') ||
    localStorage.getItem('boards')

  if (hasLocalData && !wasExplicitLoad) {
    console.warn('⚠️ Skipping fragment load: local data already exists')
    return
  }

  try {
    if (cfgParam) {
      const cfg = await gunzipBase64urlToJson(cfgParam)
      localStorage.setItem('config', JSON.stringify(cfg))
      if (Array.isArray(cfg.boards)) {
        localStorage.setItem('boards', JSON.stringify(cfg.boards))
      }
      logger.info('✅ Config geladen uit fragment')
    }

    if (svcParam) {
      const svc = await gunzipBase64urlToJson(svcParam)
      localStorage.setItem('services', JSON.stringify(svc))
      logger.info('✅ Services geladen uit fragment')
    }
  } catch (e) {
    logger.error('❌ Fout bij laden uit fragment:', e)
    showNotification('Fout bij laden van dashboardconfiguratie uit URL fragment.', 4000, 'error')
  }
}
