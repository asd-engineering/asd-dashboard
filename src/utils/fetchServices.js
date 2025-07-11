// @ts-check
/**
 * Fetch a list of services from various sources and store them globally.
 *
 * @module utils/fetchServices
 */
import { Logger } from './Logger.js'
import { showNotification } from '../component/dialog/notification.js'
import StorageManager from '../storage/StorageManager.js'

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
    return JSON.parse(atob(data))
  } catch (e) {
    logger.error('Failed to parse base64 services:', e)
    showNotification('Invalid services data', 3000, 'error')
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
    return await response.json()
  } catch (e) {
    logger.error('Failed to fetch services:', e)
    showNotification('Invalid services data', 3000, 'error')
    return null
  }
}

/**
 * Fetch the service list and update the service selector on the page.
 *
 * @function fetchServices
 * @returns {Promise<Array<Service>>} Array of service objects.
 */
export const fetchServices = async () => {
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
    if (stored.length > 0) {
      services = stored
    }
  }

  if (!services) {
    services = await fetchJson('services.json')
  }

  services = services || []
  StorageManager.setServices(services)

  const serviceSelector = document.getElementById('service-selector')
  if (serviceSelector) {
    serviceSelector.innerHTML = ''
    const defaultOption = document.createElement('option')
    defaultOption.value = ''
    defaultOption.textContent = 'Select a Service'
    serviceSelector.appendChild(defaultOption)
    services.forEach(service => {
      const option = document.createElement('option')
      option.value = service.url
      option.textContent = service.name
      serviceSelector.appendChild(option)
    })
  }

  return services
}
