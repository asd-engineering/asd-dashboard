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

const logger = new Logger('getConfig.js')
const STORAGE_KEY = 'config'

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

async function loadFromSources () {
  const params = new URLSearchParams(window.location.search)

  if (params.has('config_base64')) {
    const cfg = parseBase64(params.get('config_base64'))
    if (cfg) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
      if (Array.isArray(cfg.boards)) {
        localStorage.setItem('boards', JSON.stringify(cfg.boards))
      }
      window.history.replaceState(null, '', location.pathname)
      return cfg
    }
    return null
  }

  if (params.has('config_url')) {
    const cfgU = await fetchJson(params.get('config_url'))
    if (cfgU) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfgU))
      if (Array.isArray(cfgU.boards)) {
        localStorage.setItem('boards', JSON.stringify(cfgU.boards))
      }
      window.history.replaceState(null, '', location.pathname)
      return cfgU
    }
    return null
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      logger.error('Failed to parse config from localStorage:', e)
    }
  }

  const cfgJ = await fetchJson('config.json')

  if (!cfgJ) {
    showNotification('Default configuration has been loaded. Please review and save.')
    const cfg = DEFAULT_CONFIG_TEMPLATE
    localStorage.setItem('config', JSON.stringify(cfg))
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  logger.log('Config loaded successfully')
  return config
}
