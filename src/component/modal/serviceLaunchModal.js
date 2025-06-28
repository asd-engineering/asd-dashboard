import { showNotification } from '../dialog/notification.js'
import { Logger } from '../../utils/Logger.js'
import { getUUID } from '../../utils/utils.js'

const logger = new Logger('serviceLaunchModal.js')

export function showServiceModal (serviceObj, widgetWrapper) {
  logger.log('Opening recovery modal for action:', serviceObj.name)

  const modal = document.createElement('div')
  modal.className = 'service-action-modal'
  modal.dataset.uuid = getUUID()

  const iframe = document.createElement('iframe')
  iframe.src = serviceObj.url

  const instructions = document.createElement('p')
  instructions.textContent = "The action is being performed. Please wait a few moments and then press 'Done and Refresh Widget' to reload the widget."

  const doneButton = document.createElement('button')
  doneButton.textContent = 'Done and Refresh Widget'
  doneButton.onclick = () => {
    logger.log('Done button clicked, refreshing widget.')
    modal.remove()
    try {
      const iframe = widgetWrapper.querySelector('iframe')
      iframe.src = widgetWrapper.dataset.url // Refresh iframe
      logger.log('Widget iframe refreshed successfully.')
    } catch (error) {
      logger.error('Error refreshing widget iframe:', error)
      showNotification('Failed to refresh widget. Please try again.')
    }
  }

  modal.appendChild(instructions)
  modal.appendChild(iframe)
  modal.appendChild(doneButton)

  document.body.appendChild(modal)
  logger.log('Service modal displayed.')
}
