import { Logger } from './Logger.js'
import { openConfigModal, DEFAULT_CONFIG_TEMPLATE } from '../component/modal/configModal.js'
import { showNotification } from '../component/dialog/notification.js'

const logger = new Logger('getConfig.js')
const STORAGE_KEY = 'config'

function parseBase64 (data) {
  try {
    return JSON.parse(atob(data))
  } catch (e) {
    logger.error('Failed to parse base64 config:', e)
    showNotification('Invalid base64 configuration')
    return null
  }
}

async function fetchJson (url) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      if (response.status === 404) {
        showNotification('Configuration not found (404). Please input manually.')
      } else {
        showNotification('Invalid configuration from URL')
      }
      return null
    }
    try {
      return await response.json()
    } catch (err) {
      logger.error('Failed to parse remote config JSON:', err)
      showNotification('Invalid configuration JSON. Please check the remote URL.')
      return null
    }
  } catch (e) {
    logger.error('Failed to fetch config from URL:', e)
    showNotification('Invalid configuration from URL')
    return null
  }
}

async function loadFromSources () {
  const params = new URLSearchParams(window.location.search)

  if (params.has('config_base64')) {
    const cfg = parseBase64(params.get('config_base64'))
    if (cfg) {
      window.history.replaceState(null, '', location.pathname)
      return cfg
    }
    return null
  }

  if (params.has('config_url')) {
    const cfg = await fetchJson(params.get('config_url'))
    if (cfg) {
      window.history.replaceState(null, '', location.pathname)
      return cfg
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

  const cfg = await fetchJson('config.json')
  if (cfg) return cfg

  return null
}

export async function getConfig () {
  if (window.asd && window.asd.config && Object.keys(window.asd.config).length > 0) {
    logger.log('Using cached configuration')
    return window.asd.config
  }

  const config = await loadFromSources()
  if (!config) {
    openConfigModal(DEFAULT_CONFIG_TEMPLATE)
    throw new Error('No configuration available')
  }

  window.asd.config = config
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  logger.log('Config loaded successfully')
  return config
}
