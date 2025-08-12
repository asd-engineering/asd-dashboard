// @ts-check
/**
 * Export dashboard configuration and services to a sharable URL.
 *
 * @module configModal/exportConfig
 */
import { showNotification } from '../dialog/notification.js'
import { encodeConfig } from '../../utils/compression.js'
import { Logger } from '../../utils/Logger.js'
import StorageManager from '../../storage/StorageManager.js'
import { minimizeDeep } from '../../utils/minimizer.js'
import { splitIntoParams, formatChunksManifest } from '../../utils/chunker.js'
import { computeCRC32Hex } from '../../utils/checksum.js'
import { applyKeyMap } from '../../utils/keymap.js'
import { DEFAULT_CONFIG_TEMPLATE } from '../../storage/defaultConfig.js'

const logger = new Logger('exportConfig.js')

// Reversible key map: map long property names to short tokens.
// Populate this map to reduce URL size further.
/** @type {Record<string,string>} */
const KEY_MAP = {
  // e.g. 'serviceId': 'i'
}

const MINIMIZE_ENABLED = true
const CHUNK_MAX_LEN = 12000

// Default compression algorithm. Deflate omits gzip headers and is slightly smaller.
const DEFAULT_ALGO = 'deflate'

/**
 * Generate shareable URL from stored config and services,
 * copy it to the clipboard and persist a snapshot.
 *
 * @function exportConfig
 * @returns {Promise<void>}
 */
export async function exportConfig () {
  try {
    const cfg = StorageManager.getConfig()
    const svc = StorageManager.getServices()

    if (!cfg || !svc) {
      logger.warn('Export aborted: missing config or services')
      showNotification('❌ Cannot export: config or services are missing', 4000, 'error')
      return
    }

    const cfgMapped = applyKeyMap(cfg, KEY_MAP, 'encode')
    const svcMapped = applyKeyMap(svc, KEY_MAP, 'encode')
    const cfgDefaults = applyKeyMap(DEFAULT_CONFIG_TEMPLATE, KEY_MAP, 'encode')
    const svcDefaults = []

    const cfgMin = MINIMIZE_ENABLED
      ? minimizeDeep(cfgMapped, cfgDefaults, { dropEmpties: true }) ?? {}
      : cfgMapped
    const svcMin = MINIMIZE_ENABLED
      ? minimizeDeep(svcMapped, svcDefaults, { dropEmpties: true }) ?? []
      : svcMapped

    const [cfgRes, svcRes] = await Promise.all([
      encodeConfig(cfgMin, { algo: DEFAULT_ALGO, withChecksum: true }),
      encodeConfig(svcMin, { algo: DEFAULT_ALGO, withChecksum: true })
    ])
    const cfgEnc = cfgRes.data
    const svcEnc = svcRes.data
    const cfgCrc = cfgRes.checksum || ''
    const svcCrc = svcRes.checksum || ''

    const ccw = computeCRC32Hex(JSON.stringify({ c: cfgMin, s: svcMin }))

    const defaultName = `Snapshot ${new Date().toISOString()}`
    const name = prompt('Name this export', defaultName) || defaultName

    const params = new URLSearchParams()
    params.set('name', encodeURIComponent(name))
    params.set('algo', DEFAULT_ALGO)
    params.set('cc', `${cfgCrc},${svcCrc}`)
    params.set('ccw', ccw)

    const cfgPairs = splitIntoParams('cfg', cfgEnc, CHUNK_MAX_LEN)
    const svcPairs = splitIntoParams('svc', svcEnc, CHUNK_MAX_LEN)
    for (const [k, v] of [...cfgPairs, ...svcPairs]) params.set(k, v)

    const manifest = formatChunksManifest({
      cfg: cfgPairs.length > 1 ? cfgPairs.length : 0,
      svc: svcPairs.length > 1 ? svcPairs.length : 0
    })
    if (manifest) params.set('chunks', manifest)
    const url = `${location.origin}${location.pathname}#${params.toString()}`
    await navigator.clipboard.writeText(url)

    const kb = (url.length / 1024).toFixed(1)
    showNotification(`✅ URL copied to clipboard! (${kb} KB)`, 4000, 'success')
    logger.info(`Exported config URL (${url.length} chars) named ${name}`)

    if (url.length > 60000) {
      showNotification('⚠️ URL is very large even with chunking and may not work in all browsers', 6000, 'error')
      logger.warn(`Exported URL length: ${url.length}`)
    }

    await StorageManager.saveStateSnapshot({ name, type: 'exported', cfg: cfgEnc, svc: svcEnc })
  } catch (e) {
    showNotification('❌ Failed to export config', 4000, 'error')
    logger.error('Export failed', e)
  }
}
