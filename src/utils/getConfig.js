// @ts-check
/**
 * Load configuration from query parameters, localStorage or defaults.
 *
 * @module getConfig
 */
import { Logger } from './Logger.js'
import { openLocalStorageModal } from '../component/modal/localStorageModal.js'
import { showNotification } from '../component/dialog/notification.js'
import { openConfigModal, DEFAULT_CONFIG_TEMPLATE } from '../component/modal/configModal.js'
import StorageManager from '../storage/StorageManager.js'

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
    openLocalStorageModal()
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

  if (params.has('config_base64')) {
    const cfg = parseBase64(params.get('config_base64'))
    if (cfg) {
      StorageManager.setConfig(cfg)
      window.history.replaceState(null, '', location.pathname)
      return cfg
    }
    return null
  }

  if (params.has('config_url')) {
    const cfgU = await fetchJson(params.get('config_url'))
    if (cfgU) {
      StorageManager.setConfig(cfgU)
      window.history.replaceState(null, '', location.pathname)
      return cfgU
    }
    return null
  }

  const stored = StorageManager.getConfig()
  if (stored) {
    return stored
  }

  const cfgJ = await fetchJson('config.json')

  if (!cfgJ) {
    showNotification('Default configuration has been loaded. Please review and save.')
    const cfg = DEFAULT_CONFIG_TEMPLATE
    StorageManager.setConfig(cfg)
    openConfigModal()
    return cfg
  } else {
    return cfgJ
  }
}

/**
 * Load and cache the dashboard configuration from multiple sources.
 *
 * @function getConfig
 * @returns {Promise<Object>} Parsed configuration object.
 */
export async function getConfig () {
  if (window.asd && window.asd.config && Object.keys(window.asd.config).length > 0) {
    logger.log('Using cached configuration')
    return window.asd.config
  }

  const config = await loadFromSources()
  if (!config) {
    openConfigModal()
    throw new Error('No configuration available')
  }

  window.asd.config = config
  StorageManager.setConfig(config)
  logger.log('Config loaded successfully')
  return config
}
