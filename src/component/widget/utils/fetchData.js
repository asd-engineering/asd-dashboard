import { Logger } from '../../../utils/Logger.js'

const logger = new Logger('fetchData.js')

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

function getAuthToken () {
  return 'YOUR_API_TOKEN' // Placeholder
}

export { fetchData, getAuthToken }
