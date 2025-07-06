// @ts-check
/**
 * Fetch a list of services from various sources and store them globally.
 *
 * @module utils/fetchServices
 */
import { Logger } from './Logger.js'
import { showNotification } from '../component/dialog/notification.js'

/** @typedef {import('../types.js').Service} Service */

const logger = new Logger('fetchServices.js')
const STORAGE_KEY = 'services'

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
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        services = JSON.parse(stored)
      } catch (e) {
        logger.error('Failed to parse services from localStorage:', e)
      }
    }
  }

  if (!services) {
    services = await fetchJson('services.json')
  }

  services = services || []
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services))
  window.asd.services = services

  const container = document.querySelector('#widget-selector-panel .dropdown-content')
  if (container) {
    container.innerHTML = ''
    const newItem = document.createElement('div')
    newItem.textContent = 'New Service'
    newItem.className = 'widget-option new-service'
    container.appendChild(newItem)
    services.forEach(service => {
      const item = document.createElement('div')
      item.textContent = service.name
      item.className = 'widget-option'
      item.dataset.url = service.url
      container.appendChild(item)
    })
    const { updateWidgetCounter } = await import('../component/menu/widgetSelectorPanel.js')
    updateWidgetCounter()
  }

  return services
}
