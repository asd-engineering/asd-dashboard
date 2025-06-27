import { Logger } from './Logger.js'

const logger = new Logger('fetchServices.js')
const STORAGE_KEY = 'services'

function parseBase64 (data) {
  try {
    return JSON.parse(atob(data))
  } catch (e) {
    logger.error('Failed to parse base64 services:', e)
    return null
  }
}

async function fetchJson (url) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`)
    return await response.json()
  } catch (e) {
    logger.error('Failed to fetch services:', e)
    return null
  }
}

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
