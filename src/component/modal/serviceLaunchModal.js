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
import { upsertTask, updateTask } from '../runtime/runtimeState.js'

const logger = new Logger('serviceLaunchModal.js')

/**
 * Open a modal that loads a service URL in an iframe to perform an action.
 * After completion the widget iframe is refreshed.
 *
 * @param {{url: string, name?: string, id?: string}} serviceObj - Service information with a URL.
 * @param {HTMLElement|null} widgetWrapper - Widget element to refresh.
 * @param {{taskId?: string}} [opts]
 * @function showServiceModal
 * @returns {void}
 */
export function showServiceModal (serviceObj, widgetWrapper = null, opts = {}) {
  const taskId = opts.taskId || `task-${getUUID()}`
  const taskTitle = serviceObj.name || serviceObj.id || 'Service Task'
  const openTask = () => showServiceModal(serviceObj, widgetWrapper, { taskId })

  upsertTask({
    id: taskId,
    title: taskTitle,
    status: 'running',
    open: openTask
  })

  let completed = false
  openModal({
    id: `service-action-modal-${taskId}`,
    onCloseCallback: () => {
      if (!completed) {
        updateTask(taskId, { status: 'minimized', open: openTask })
      }
      logger.log('Service modal closed')
    },
    buildContent: (modal, closeModal) => {
      const iframe = document.createElement('iframe')
      iframe.src = serviceObj.url
      const instructions = document.createElement('p')
      instructions.textContent = "The action is being performed. Please wait a few moments and then press 'Done and refresh widget'"
      const minimizeButton = document.createElement('button')
      minimizeButton.textContent = 'Minimize task'
      minimizeButton.addEventListener('click', () => {
        updateTask(taskId, { status: 'minimized', open: openTask })
        closeModal()
      })
      const doneButton = document.createElement('button')
      doneButton.textContent = 'Done and refresh widget'
      doneButton.addEventListener('click', () => {
        completed = true
        updateTask(taskId, { status: 'done', open: openTask })
        closeModal()
        try {
          if (widgetWrapper) {
            const iframeEl = widgetWrapper.querySelector('iframe')
            iframeEl.src = widgetWrapper.dataset.url
          }
        } catch (error) {
          logger.error('Error refreshing widget iframe:', error)
          showNotification('Failed to refresh widget')
        }
      })
      modal.append(instructions, iframe, minimizeButton, doneButton)
    }
  })
}
