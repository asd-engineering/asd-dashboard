// @ts-check
/**
 * Fetch a list of services from various sources and store them globally.
 *
 * @module utils/fetchServices
 */
import { Logger } from './Logger.js'
import { showNotification } from '../component/dialog/notification.js'
import { StorageManager } from '../storage/StorageManager.js'

/** @typedef {import('../types.js').Service} Service */

const logger = new Logger('fetchServices.js')

/**
 * Parses a base64 encoded JSON string.
 * @function parseBase64
 * @param {string} data - The base64 encoded string.
 * @returns {object|null} The parsed object, or null on error.
 */
function parseBase64 (data) {
  try {
    return normalizeServicesPayload(JSON.parse(atob(data)))
  } catch (e) {
    logger.error('Failed to parse base64 services:', e)
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
    if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`)
    const payload = await response.json()
    return normalizeServicesPayload(payload)
  } catch (e) {
    logger.error('Failed to fetch services:', e)
    return null
  }
}

/**
 * Normalize incoming payload to service array.
 * @param {any} payload
 * @returns {Array<Service>|null}
 */
function normalizeServicesPayload (payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.services)) return payload.services
  if (payload == null) return null
  logger.error('Invalid services payload shape:', payload)
  return []
}

/**
 * Fetch the service list and publish it to StorageManager.
 * Emits a 'services-updated' event for the widget selector panel.
 *
 * @function fetchServices
 * @returns {Promise<Array<Service>>} Array of service objects.
 */
export const fetchServices = async () => {
  const params = new URLSearchParams(window.location.search)
  let services = null
  let failedAttempts = 0

  // Priority 1: Explicit base64 parameter (highest priority for backwards compat)
  if (params.has('services_base64')) {
    services = parseBase64(params.get('services_base64'))
    if (!services) failedAttempts++
  }

  // Priority 2: servicesUrl from config (fragment-based URL reference)
  if (!services) {
    const config = StorageManager.getConfig()
    if (config && config.servicesUrl) {
      logger.info(`Fetching services from config.servicesUrl: ${config.servicesUrl}`)
      services = await fetchJson(config.servicesUrl)
      if (!services) failedAttempts++
    }
  }

  // Priority 3: Explicit services_url parameter (backwards compat)
  if (!services && params.has('services_url')) {
    services = await fetchJson(params.get('services_url'))
    if (!services) failedAttempts++
  }

  // Priority 4: localStorage (previously saved services)
  if (!services) {
    const stored = StorageManager.getServices()
    if (stored.length > 0) {
      services = stored
    }
  }

  // Priority 5: Local services.json file (fallback)
  if (!services) {
    services = await fetchJson('services.json')
    if (!services) failedAttempts++
  }

  services = services || []
  if (services.length === 0 && failedAttempts > 0) {
    showNotification('Invalid services data', 3000, 'error')
  }

  // Persist via main's storage model
  StorageManager.setServices(services)

  // Notify UI (widget selector listens to this)
  document.dispatchEvent(new CustomEvent('services-updated'))

  return services
}
