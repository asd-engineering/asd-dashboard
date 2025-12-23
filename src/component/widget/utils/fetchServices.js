// @ts-check
/**
 * Cached wrapper around the core fetchServices helper used by the widget UI.
 *
 * @module component/widget/utils/fetchServices
 */
import { fetchServices as fetchServicesCore } from '../../../utils/fetchServices.js'
import { Logger } from '../../../utils/Logger.js'

const logger = new Logger('widget/fetchServices.js')

let serviceCache = null
let lastFetchTime = 0
const CACHE_DURATION_MS = 60_000

/**
 * Fetch services with lightweight caching so widget panels avoid redundant work.
 * Delegates to the shared core implementation to ensure consistent priority order.
 *
 * @function fetchServices
 * @returns {Promise<Array<import('../../../types.js').Service>>}
 */
export async function fetchServices () {
  const now = Date.now()
  if (serviceCache && now - lastFetchTime < CACHE_DURATION_MS) {
    logger.log('Returning cached services for widget utilities')
    return serviceCache
  }

  serviceCache = await fetchServicesCore()
  lastFetchTime = now
  return serviceCache
}
