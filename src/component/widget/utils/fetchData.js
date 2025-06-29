/**
 * Utility for fetching data and posting to widgets.
 *
 * @module fetchData
 */
import { Logger } from '../../../utils/Logger.js'

const logger = new Logger('fetchData.js')

/**
 * Fetch JSON data from a URL and pass it to a callback.
 *
 * @param {string} url - Endpoint to request.
 * @param {Function} callback - Receives the parsed JSON.
 * @returns {void}
 */
function fetchData (url, callback) {
  logger.log('Fetching data from URL:', url)
  fetch(url, {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`)
      }
      return response.json()
    })
    .then(data => {
      callback(data)
    })
    .catch(error => {
      logger.error('Error fetching data:', error)
    })
}

/**
 * Retrieve the auth token for API requests.
 *
 * @returns {string}
 */
function getAuthToken () {
  return 'YOUR_API_TOKEN' // Placeholder
}

export { fetchData, getAuthToken }
