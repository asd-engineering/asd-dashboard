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
import { decodeConfig } from './compression.js'
import { openFragmentDecisionModal } from '../component/modal/fragmentDecisionModal.js'
import { StorageManager } from '../storage/StorageManager.js'
import emojiList from '../ui/unicodeEmoji.js'
import { restoreDeep } from './minimizer.js'
import { joinFromParams, parseChunksManifest } from './chunker.js'
import { computeCRC32Hex } from './checksum.js'
import { applyKeyMap } from './keymap.js'
import { DEFAULT_CONFIG_TEMPLATE } from '../storage/defaultConfig.js'
import { FRAG_MINIMIZE_ENABLED } from './fragmentConstants.js'
import { KEY_MAP } from './fragmentKeyMap.js'

const logger = new Logger('fragmentLoader.js')

/**
 * Parse the URL fragment and store config/services with the StorageManager
 *
 * @function loadFromFragment
 * @param {boolean} [wasExplicitLoad=false] - Skip guard when true.
 * @returns {Promise<{cfg:string|null,svc:string|null,name:string}>}
 */
export async function loadFromFragment (wasExplicitLoad = false) {
  // Test instrumentation: count fragment loads to detect duplicate invocations.
  // @ts-ignore
  window.__fragmentLoadCount = (window.__fragmentLoadCount || 0) + 1
  if (!('DecompressionStream' in window)) {
    if (location.hash.includes('cfg=') || location.hash.includes('svc=')) {
      showNotification('⚠️ DecompressionStream not supported by this browser.', 4000, 'error')
    }
    logger.warn('DecompressionStream not supported, fragment loader skipped.', { reason: 'unsupported API' })
    return
  }

  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : ''
  const params = new URLSearchParams(hash)
  let nameParam = params.get('name') || 'imported'
  const algoParam = params.get('algo') || 'gzip'
  const ccParam = params.get('cc')
  const checks = ccParam ? ccParam.split(',') : []
  const cfgChecksum = checks[0] || null
  const svcChecksum = checks[1] || null
  const ccw = params.get('ccw')
  parseChunksManifest(params.get('chunks') || '')
  const cfgParam = joinFromParams('cfg', params)
  const svcParam = joinFromParams('svc', params)

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
    await openFragmentDecisionModal({ cfgParam, svcParam, nameParam, algoParam, ccParam })
    // Return shape mirrors explicit loads; callers typically ignore this branch.
    return { cfg: cfgParam, svc: svcParam, name: nameParam }
  }

  try {
    let cfgObj = null
    let svcArr = null
    if (cfgParam) {
      const decoded = await decodeConfig(cfgParam, {
        algo: /** @type {'gzip'|'deflate'} */ (algoParam),
        expectChecksum: cfgChecksum
      })
      cfgObj = decoded
    }

    if (svcParam) {
      const decoded = await decodeConfig(svcParam, {
        algo: /** @type {'gzip'|'deflate'} */ (algoParam),
        expectChecksum: svcChecksum
      })
      svcArr = decoded
    }

    if (ccw) {
      const calc = computeCRC32Hex(JSON.stringify({ c: cfgObj ?? null, s: svcArr ?? null }))
      if (calc !== ccw) throw new Error(`Fragment ccw mismatch: expected ${ccw}, got ${calc}`)
    }

    const cfgDefaults = applyKeyMap(DEFAULT_CONFIG_TEMPLATE, KEY_MAP, 'encode')
    const svcDefaults = []
    const cfgRestored = cfgObj ? (FRAG_MINIMIZE_ENABLED ? restoreDeep(cfgObj, cfgDefaults) : cfgObj) : null
    const svcRestored = svcArr ? (FRAG_MINIMIZE_ENABLED ? restoreDeep(svcArr, svcDefaults) : svcArr) : null
    const cfg = cfgRestored ? applyKeyMap(cfgRestored, KEY_MAP, 'decode') : null
    const svc = svcRestored ? applyKeyMap(svcRestored, KEY_MAP, 'decode') : null

    if (cfg) {
      StorageManager.setConfig(cfg)
      logger.info('✅ Config loaded from fragment')
    }

    if (svc) {
      StorageManager.setServices(svc)
      logger.info('✅ Services loaded from fragment')
    }

    // Telemetry: count successful imports.
    // @ts-ignore
    window.__fragmentImportSuccessCount = (window.__fragmentImportSuccessCount || 0) + 1
  } catch (e) {
    let reason = 'unknown'
    if (e instanceof Error) {
      if (e.message.includes('Checksum mismatch')) reason = 'checksum mismatch'
      else if (e instanceof SyntaxError) reason = 'json parse'
      else reason = e.message
    }
    logger.error(`${emojiList.cross.icon} Error while loading from fragment:`, { reason })
    showNotification('Error loading dashboard configuration from URL fragment.', 4000, 'error')
  }

  return { cfg: cfgParam, svc: svcParam, name: nameParam }
}
