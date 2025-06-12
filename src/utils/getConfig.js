import { Logger } from './Logger.js'

const logger = new Logger('getConfig.js')

async function getConfig () {
  if (window.asd && window.asd.config && Object.keys(window.asd.config).length > 0) {
    logger.log('Using cached configuration')
    return window.asd.config
  }

  try {
    const response = await fetch('config.json')
    if (!response.ok) {
      throw new Error('Network response was not ok')
    }
    const config = await response.json()
    window.asd.config = config // Cache the configuration
    logger.log('Config loaded successfully')
    return config
  } catch (error) {
    logger.error('Error fetching config.json:', error)
    throw new Error('Failed to load configuration')
  }
}

export { getConfig }
