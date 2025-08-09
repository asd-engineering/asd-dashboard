// @ts-check
/**
 * Utilities for persisting dashboard state snapshots.
 *
 * @module snapshots
 */

import StorageManager from '../storage/StorageManager.js'
import { gzipJsonToBase64url } from '../utils/compression.js'

/**
 * Save the existing dashboard state as an autosave snapshot if any state exists.
 *
 * @function autosaveIfPresent
 * @returns {Promise<string|null>} Name of the snapshot or null if skipped
 */
export async function autosaveIfPresent () {
  const existingCfg = StorageManager.getConfig()
  const existingSvc = StorageManager.getServices()
  const hasState =
    (Array.isArray(existingCfg?.boards) && existingCfg.boards.length > 0) ||
    (Array.isArray(existingSvc) && existingSvc.length > 0)

  if (!hasState) return null

  const [cfgEnc, svcEnc] = await Promise.all([
    gzipJsonToBase64url(existingCfg),
    gzipJsonToBase64url(existingSvc)
  ])

  const name = `autosave/${new Date().toISOString()}`
  await StorageManager.saveStateSnapshot({
    name,
    type: 'autosave',
    cfg: cfgEnc,
    svc: svcEnc
  })
  return name
}

/**
 * Persist an imported snapshot using already encoded cfg & svc strings.
 *
 * @function saveImportedSnapshot
 * @param {string} name
 * @param {string|null} cfg
 * @param {string|null} svc
 * @returns {Promise<string>} Final snapshot name used
 */
export async function saveImportedSnapshot (name, cfg, svc) {
  const finalName = name && name.trim().length ? name.trim() : `import/${new Date().toISOString()}`
  await StorageManager.saveStateSnapshot({
    name: finalName,
    type: 'imported',
    cfg: cfg || '',
    svc: svc || ''
  })
  return finalName
}
