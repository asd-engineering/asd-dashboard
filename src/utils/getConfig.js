// @ts-check
/**
 * Load configuration from query parameters, localStorage or defaults.
 *
 * @module getConfig
 */
import { Logger } from './Logger.js'
import { showNotification } from '../component/dialog/notification.js'
import { openConfigModal } from '../component/modal/configModal.js'
import { DEFAULT_CONFIG_TEMPLATE } from '../storage/defaultConfig.js'
import { StorageManager } from '../storage/StorageManager.js'
import { deepEqual } from '../utils/objectUtils.js'

const logger = new Logger('getConfig.js')

/**
 * Parses a base64 encoded JSON string.
 * @function parseBase64
 * @param {string} data - The base64 encoded string.
 * @returns {object|null} The parsed object, or null on error.
 */
function parseBase64 (data) {
  try {
    return JSON.parse(atob(data))
  } catch (e) {
    logger.error('Failed to parse base64 config:', e)
    showNotification('Invalid base64 configuration', 3000, 'error')
    openConfigModal().catch(error => {
      logger.error('Error opening config modal:', error)
    })
    return null
  }
}

/**
 * Fetches and parses a JSON file from a URL.
 * @function fetchJson
 * @param {string} url - The URL to fetch JSON from.
 * @returns {Promise<object|null>} The parsed object, or null on error.
 */
async function fetchJson (url) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      if (response.status === 404) {
        logger.info('Configuration not found (404).')
      } else {
        showNotification('Invalid configuration from URL', 3000, 'error')
      }
      return null
    }
    try {
      return await response.json()
    } catch (err) {
      logger.error('Failed to parse remote config JSON:', err)
      showNotification('Invalid configuration JSON. Please check the remote URL.', 3000, 'error')
      return null
    }
  } catch (e) {
    logger.error('Failed to fetch config from URL:', e)
    showNotification('Invalid configuration from URL', 3000, 'error')
    return null
  }
}

/**
 * Loads configuration from various sources in a specific order: URL params, localStorage, then a default file.
 * @async
 * @function loadFromSources
 * @returns {Promise<object|null>} A promise that resolves to the configuration object or null.
 */
async function loadFromSources () {
  const params = new URLSearchParams(window.location.search)

  // 1. Explicit base64 parameter
  if (params.has('config_base64')) {
    const cfg = parseBase64(params.get('config_base64'))
    if (cfg) {
      StorageManager.setConfig(cfg)
      window.history.replaceState(null, '', location.pathname)
      return cfg
    }
    return null
  }

  // 2. Explicit config URL parameter
  if (params.has('config_url')) {
    const cfg = await fetchJson(params.get('config_url'))
    if (cfg) {
      StorageManager.setConfig(cfg)
      window.history.replaceState(null, '', location.pathname)
      return cfg
    }
    return null
  }

  // 3. Get stored config
  const stored = StorageManager.getConfig()

  // Check if config is missing or is effectively just the default template
  const isEmpty = !stored || deepEqual(stored, DEFAULT_CONFIG_TEMPLATE)

  if (isEmpty) {
    const cfgJ = await fetchJson('config.json')

    if (cfgJ) {
      const cfg = cfgJ.data || cfgJ
      StorageManager.setConfig(cfg)
      return cfg
    }

    // 4. Nothing worked → load default and prompt user
    showNotification('Default configuration has been loaded. Please review and save.')
    StorageManager.setConfig(DEFAULT_CONFIG_TEMPLATE)
    await openConfigModal()
    return DEFAULT_CONFIG_TEMPLATE
  }

  return stored
}

/**
 * Load and cache the dashboard configuration from multiple sources.
 *
 * @function getConfig
 * @returns {Promise<Object>} Parsed configuration object.
 */
export async function getConfig () {
  const config = await loadFromSources()
  if (!config) {
    openConfigModal().catch(error => {
      logger.error('Error opening config modal:', error)
    })
    throw new Error('No configuration available')
  }

  StorageManager.setConfig(config)
  logger.log('Config loaded successfully')
  return config
}
