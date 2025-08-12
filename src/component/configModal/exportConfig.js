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

const logger = new Logger('exportConfig.js')

// Reversible key map: map long property names to short tokens.
// Populate this map to reduce URL size further.
/** @type {Record<string,string>} */
const KEY_MAP = {
  // e.g. 'serviceId': 'i'
}

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

    const [cfgRes, svcRes] = await Promise.all([
      encodeConfig(cfg, { algo: DEFAULT_ALGO, keyMap: KEY_MAP, withChecksum: true }),
      encodeConfig(svc, { algo: DEFAULT_ALGO, keyMap: KEY_MAP, withChecksum: true })
    ])
    const cfgEnc = cfgRes.data
    const svcEnc = svcRes.data
    const cfgCrc = cfgRes.checksum || ''
    const svcCrc = svcRes.checksum || ''

    const defaultName = `Snapshot ${new Date().toISOString()}`
    const name = prompt('Name this export', defaultName) || defaultName

    const params = new URLSearchParams()
    params.set('cfg', cfgEnc)
    params.set('svc', svcEnc)
    params.set('name', encodeURIComponent(name))
    params.set('algo', DEFAULT_ALGO)
    params.set('cc', `${cfgCrc},${svcCrc}`)
    const url = `${location.origin}${location.pathname}#${params.toString()}`
    await navigator.clipboard.writeText(url)

    const kb = (url.length / 1024).toFixed(1)
    showNotification(`✅ URL copied to clipboard! (${kb} KB)`, 4000, 'success')
    logger.info(`Exported config URL (${url.length} chars) named ${name}`)

    if (url.length > 60000) {
      showNotification('⚠️ URL is very large and may not work in all browsers', 6000, 'error')
      logger.warn(`Exported URL length: ${url.length}`)
    }

    await StorageManager.saveStateSnapshot({ name, type: 'exported', cfg: cfgEnc, svc: svcEnc })
  } catch (e) {
    showNotification('❌ Failed to export config', 4000, 'error')
    logger.error('Export failed', e)
  }
}
