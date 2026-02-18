// @ts-check
/**
 * Modal used to launch a service-specific action in an iframe.
 *
 * @module serviceLaunchModal
 */
import { openModal } from './modalFactory.js'
import { showNotification } from '../dialog/notification.js'
import { Logger } from '../../utils/Logger.js'
import { getUUID } from '../../utils/utils.js'

const logger = new Logger('serviceLaunchModal.js')

/**
 * Open a modal that loads a service URL in an iframe to perform an action.
 * After completion the widget iframe is refreshed.
 *
 * @param {{url: string, name?: string}} serviceObj - Service information with a URL.
 * @param {HTMLElement | null} widgetWrapper - Widget element to refresh.
 * @param {{onDone?: Function}} [opts]
 * @function showServiceModal
 * @returns {void}
 */
export function showServiceModal (serviceObj, widgetWrapper = null, opts = {}) {
  const taskSessionId = `task-${Date.now()}-${String(getUUID()).slice(0, 8)}`
  const taskUrl = withTaskSessionArg(serviceObj.url, taskSessionId)
  openModal({
    id: `service-action-modal-${getUUID()}`,
    onCloseCallback: () => logger.log('Service modal closed'),
    buildContent: (modal, closeModal) => {
      modal.classList.add('service-action-modal')
      const iframe = document.createElement('iframe')
      iframe.src = taskUrl
      const instructions = document.createElement('p')
      instructions.textContent = "The action is being performed. Please wait a few moments and then press 'Done and refresh widget'"
      const openInNewTab = document.createElement('a')
      openInNewTab.href = taskUrl
      openInNewTab.target = '_blank'
      openInNewTab.rel = 'noopener noreferrer'
      openInNewTab.textContent = 'Open task in new tab'
      const minimizeButton = document.createElement('button')
      minimizeButton.textContent = 'Minimize task'
      minimizeButton.addEventListener('click', () => {
        closeModal()
      })
      const doneButton = document.createElement('button')
      doneButton.textContent = 'Done and refresh widget'
      doneButton.addEventListener('click', () => {
        closeModal()
        document.dispatchEvent(new CustomEvent('state-change', { detail: { reason: 'services' } }))
        try {
          if (widgetWrapper) {
            const iframeEl = widgetWrapper.querySelector('iframe')
            if (iframeEl) {
              iframeEl.src = widgetWrapper.dataset.url || iframeEl.src
            }
          }
          if (typeof opts.onDone === 'function') {
            opts.onDone()
          }
        } catch (error) {
          logger.error('Error refreshing widget iframe:', error)
          showNotification('Failed to refresh widget')
        }
      })
      modal.append(instructions, openInNewTab, iframe, minimizeButton, doneButton)
    }
  })
}

/**
 * Append a unique task session id to ttyd command URL.
 * @param {string} url
 * @param {string} sessionId
 * @returns {string}
 */
function withTaskSessionArg (url, sessionId) {
  try {
    const parsed = new URL(url, window.location.origin)
    const args = parsed.searchParams.getAll('arg')
    if (args[0] === 'asd') {
      parsed.searchParams.append('arg', `--session=${sessionId}`)
      return parsed.toString()
    }
    return parsed.toString()
  } catch {
    return url
  }
}
