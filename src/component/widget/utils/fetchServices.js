import { Logger } from '../../../utils/Logger.js'

const logger = new Logger('fetchServices.js')

let serviceCache = null
let lastFetchTime = 0

export async function fetchServices () {
  const currentTime = Date.now()
  const cacheDuration = 60000 // 1 minute

  if (serviceCache && (currentTime - lastFetchTime) < cacheDuration) {
    logger.log('Returning cached services')
    return serviceCache
  }

  try {
    const response = await fetch('/services.json')
    if (response.ok) {
      serviceCache = await response.json()
      lastFetchTime = currentTime
      return serviceCache
    }
  } catch (error) {
    logger.error('Error fetching services:', error)
  }

  return []
}
