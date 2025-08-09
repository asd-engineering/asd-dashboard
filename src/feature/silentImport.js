// @ts-check
/**
 * Orchestrates the silent import flow triggered via URL flags.
 *
 * @module silentImport
 */

import { loadFromFragment } from '../utils/fragmentLoader.js'
import { clearConfigFragment } from '../utils/fragmentGuard.js'
import StorageManager from '../storage/StorageManager.js'
import { autosaveIfPresent, saveImportedSnapshot } from './snapshots.js'
import { getImportFlags, removeImportFlagsFromUrl } from '../utils/urlParams.js'
import { Logger } from '../utils/Logger.js'

const logger = new Logger('feature/silentImport.js')

// Guard against multiple simultaneous runs
let inflight = null

/**
 * Execute the silent import flow if requested by the current URL.
 *
 * @function runImportFlowIfRequested
 * @returns {Promise<boolean>} True if the import flow executed
 */
export async function runImportFlowIfRequested () {
  const { isImport, importName } = getImportFlags()
  if (!isImport) return false

  if (!inflight) {
    inflight = (async () => {
      logger.log('import.start', importName || undefined)

      const autosaveName = await autosaveIfPresent()
      if (autosaveName) logger.log('snapshot.saved', autosaveName)

      StorageManager.misc.setLastBoardId(null)
      StorageManager.misc.setLastViewId(null)

      const imported = (await loadFromFragment(true)) || { cfg: null, svc: null, name: '' }
      clearConfigFragment()

      if (imported.cfg || imported.svc) {
        const snapshotName = await saveImportedSnapshot(
          sanitizeName(importName || imported.name),
          imported.cfg,
          imported.svc
        )
        logger.log('import.success', snapshotName)

        const newCfg = StorageManager.getConfig()
        const firstBoardId = newCfg?.boards?.[0]?.id || null
        const firstViewId = newCfg?.boards?.[0]?.views?.[0]?.id || null
        StorageManager.misc.setLastBoardId(firstBoardId)
        StorageManager.misc.setLastViewId(firstViewId)
      } else {
        logger.log('import.skip', 'no-fragment-data')
      }

      removeImportFlagsFromUrl()
      return true
    })()
  }

  await inflight
  return true
}

/**
 * Sanitize a snapshot name to a safe ASCII string.
 *
 * @param {string} raw
 * @returns {string}
 */
function sanitizeName (raw) {
  if (!raw) return ''
  return raw.replace(/[^\x20-\x7E]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
}
