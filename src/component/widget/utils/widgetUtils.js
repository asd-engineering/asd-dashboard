/**
 * Helper functions used by widgets.
 *
 * @module widgetUtils
 */
import { fetchServices } from './fetchServices.js'
import { Logger } from '../../../utils/Logger.js'

const logger = new Logger('widgetUtils.js')

/**
 * Determine which service definition matches the provided URL.
 *
 * @param {string} url - Widget URL.
 * @function getServiceFromUrl
 * @returns {Promise<string>} Name of the service or 'defaultService'.
 */
async function getServiceFromUrl (url) {
  try {
    const services = await fetchServices()
    logger.log('Matching URL:', url)
    const service = services.find(service => url.startsWith(service.url))
    logger.log('Matched service:', service)
    return service ? service.name : 'defaultService'
  } catch (error) {
    logger.error('Error in getServiceFromUrl:', error)
    return 'defaultService'
  }
}

export { getServiceFromUrl }
