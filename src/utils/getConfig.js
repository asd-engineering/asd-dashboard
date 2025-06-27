import { Logger } from './Logger.js'

const logger = new Logger('getConfig.js')

async function getConfig () {
  if (window.asd && window.asd.config && Object.keys(window.asd.config).length > 0) {
    logger.log('Using cached configuration')
    return window.asd.config
  }

  // 1. Try localStorage
  const stored = localStorage.getItem('config')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      window.asd.config = parsed
      logger.log('Loaded config from localStorage')
      return parsed
    } catch (e) {
      logger.error('Invalid JSON in localStorage config')
      localStorage.removeItem('config')
    }
  }

  // 2. Check URL param for remote config
  const params = new URLSearchParams(window.location.search)
  const remoteUrl = params.get('config_url')
  if (remoteUrl) {
    try {
      const resp = await fetch(remoteUrl)
      if (!resp.ok) {
        throw new Error('Network response was not ok')
      }
      const json = await resp.json()
      localStorage.setItem('config', JSON.stringify(json))
      window.asd.config = json
      logger.log('Config loaded from remote url')
      return json
    } catch (err) {
      logger.error('Error fetching remote config:', err)
      const { openConfigModal } = await import('../component/modal/configModal.js')
      openConfigModal('')
      throw new Error('Failed to load configuration')
    }
  }

  // 3. Try default config.json
  try {
    const response = await fetch('config.json')
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const config = await response.json()
    window.asd.config = config
    localStorage.setItem('config', JSON.stringify(config))
    logger.log('Config loaded successfully')
    return config
  } catch (error) {
    logger.error('Error fetching config.json:', error)
    const { openConfigModal } = await import('../component/modal/configModal.js')
    openConfigModal('')
    throw new Error('Failed to load configuration')
  }
}

export { getConfig }
