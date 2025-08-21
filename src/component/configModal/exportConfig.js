// @ts-check
/**
 * Export dashboard configuration and services to a sharable URL.
 *
 * @module configModal/exportConfig
 */
import { showNotification } from '../dialog/notification.js'
import { gzipJsonToBase64url } from '../../utils/compression.js'
import { Logger } from '../../utils/Logger.js'
import StorageManager from '../../storage/StorageManager.js'
import emojiList from '../../ui/unicodeEmoji.js'

const logger = new Logger('exportConfig.js')

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
      showNotification(`${emojiList.cross.icon} Cannot export: config or services are missing`, 4000, 'error')
      return
    }

    const [cfgEnc, svcEnc] = await Promise.all([
      gzipJsonToBase64url(cfg),
      gzipJsonToBase64url(svc)
    ])

    const defaultName = `Snapshot ${new Date().toISOString()}`
    const name = prompt('Name this export', defaultName) || defaultName

    const url = `${location.origin}${location.pathname}#cfg=${cfgEnc}&svc=${svcEnc}&name=${encodeURIComponent(name)}`
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
    showNotification(`${emojiList.cross.icon} Failed to export config`, 4000, 'error')
    logger.error('Export failed', e)
  }
}
