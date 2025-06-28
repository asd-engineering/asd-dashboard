import { openModal } from './modalFactory.js'
import { showNotification } from '../dialog/notification.js'
import { Logger } from '../../utils/Logger.js'
import { getUUID } from '../../utils/utils.js'

const logger = new Logger('serviceLaunchModal.js')

export function showServiceModal (serviceObj, widgetWrapper) {
  openModal({
    id: `service-action-modal-${getUUID()}`,
    onCloseCallback: () => logger.log('Service modal closed'),
    buildContent: (modal, closeModal) => {
      const iframe = document.createElement('iframe')
      iframe.src = serviceObj.url
      const instructions = document.createElement('p')
      instructions.textContent = "The action is being performed. Please wait a few moments and then press 'Done and refresh widget'"
      const doneButton = document.createElement('button')
      doneButton.textContent = 'Done and refresh widget'
      doneButton.addEventListener('click', () => {
        closeModal()
        try {
          const iframeEl = widgetWrapper.querySelector('iframe')
          iframeEl.src = widgetWrapper.dataset.url
        } catch (error) {
          logger.error('Error refreshing widget iframe:', error)
          showNotification('Failed to refresh widget')
        }
      })
      modal.append(instructions, iframe, doneButton)
    }
  })
}
