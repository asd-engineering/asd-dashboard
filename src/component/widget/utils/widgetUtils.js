import { fetchServices } from './fetchServices.js'
import { Logger } from '../../../utils/Logger.js'

const logger = new Logger('widgetUtils.js')

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
