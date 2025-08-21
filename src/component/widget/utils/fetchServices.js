// @ts-check
/**
 * Utilities for retrieving the list of available services.
 *
 * @module fetchServices
 */
import { Logger } from '../../../utils/Logger.js'
import { StorageManager } from '../../../storage/StorageManager.js'

const logger = new Logger('fetchServices.js')

let serviceCache = null
let lastFetchTime = 0

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
    logger.error('Failed to parse base64 services:', e)
    return null
  }
}

/**
 * Fetches and parses a JSON file from a URL.
 * @function fetchJson
 * @param {string} url - The URL to fetch the JSON from.
 * @returns {Promise<object|null>} The parsed object, or null on error.
 */
async function fetchJson (url) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Network response was not ok')
    return await response.json()
  } catch (e) {
    logger.error('Failed to fetch services:', e)
    return null
  }
}

/**
 * Retrieve the list of services from query params, localStorage or a default file.
 *
 * @function fetchServices
 * @returns {Promise<Array>} Resolves with an array of service definitions.
 */
export async function fetchServices () {
  const currentTime = Date.now()
  const cacheDuration = 60000 // 1 minute

  if (serviceCache && (currentTime - lastFetchTime) < cacheDuration) {
    logger.log('Returning cached services')
    return serviceCache
  }

  const params = new URLSearchParams(window.location.search)
  let services = null

  if (params.has('services_base64')) {
    services = parseBase64(params.get('services_base64'))
  }

  if (!services && params.has('services_url')) {
    services = await fetchJson(params.get('services_url'))
  }

  if (!services) {
    const stored = StorageManager.getServices()
    if (stored.length) {
      services = stored
    }
  }

  if (!services) {
    services = await fetchJson('/services.json')
  }

  services = services || []
  StorageManager.setServices(services)
  serviceCache = services
  lastFetchTime = currentTime
  return serviceCache
}
