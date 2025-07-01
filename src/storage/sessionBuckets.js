// @ts-check
/**
 * Manage per-session localStorage buckets.
 *
 * @module sessionBuckets
 */
import { Logger } from '../utils/Logger.js'

const logger = new Logger('sessionBuckets.js')

export const LAST_ID_KEY = '__lastSessionId'

/**
 * Get or generate the current session id from the URL hash.
 * The hash format should be `#local:<id>`. If missing, a new id is
 * generated and persisted to localStorage. When no hash is provided
 * on first load but `__lastSessionId` exists, that id is reused.
 *
 * @function getSessionId
 * @returns {string}
 */
export function getSessionId () {
  const match = location.hash.match(/^#local:([\w-]+)$/)
  let id = null
  if (match) {
    id = match[1]
  } else {
    const stored = localStorage.getItem(LAST_ID_KEY)
    if (stored) {
      id = stored
      if (!location.hash) {
        location.hash = `#local:${id}`
      }
    } else {
      id = crypto.randomUUID()
      location.hash = `#local:${id}`
    }
  }
  localStorage.setItem(LAST_ID_KEY, id)
  logger.log('Using session id:', id)
  return id
}

/**
 * Migrate data from legacy image buckets into the current session bucket.
 * Any widget objects missing a version field will receive "1".
 *
 * @function migrateLegacyBuckets
 * @param {string} sessionId - Current session identifier.
 * @returns {void}
 */
export function migrateLegacyBuckets (sessionId) {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('image#') && !key.includes(sessionId)) {
      keys.push(key)
    }
  }
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const data = JSON.parse(raw)
      if (Array.isArray(data.boards)) {
        for (const board of data.boards) {
          for (const view of board.views || []) {
            for (const widget of view.widgetState || []) {
              if (!('version' in widget)) {
                widget.version = '1'
              }
            }
          }
        }
      }
      const bucketKey = `image#${sessionId}`
      const existingRaw = localStorage.getItem(bucketKey)
      const existing = existingRaw ? JSON.parse(existingRaw) : { boards: [] }
      if (Array.isArray(data.boards)) {
        existing.boards = existing.boards.concat(data.boards)
      }
      localStorage.setItem(bucketKey, JSON.stringify(existing))
      localStorage.removeItem(key)
    } catch (e) {
      console.debug('migrateLegacyBuckets: skipped malformed bucket', key)
    }
  }
}
