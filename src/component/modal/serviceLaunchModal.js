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
  const taskUrl = withTaskSessionArg(serviceObj.url, taskId)
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
      modal.classList.add('service-action-modal')
      const iframe = document.createElement('iframe')
      iframe.src = taskUrl
      iframe.style.width = '100%'
      iframe.style.minHeight = '420px'
      iframe.style.border = '1px solid #ccc'
      iframe.style.display = 'block'
      const instructions = document.createElement('p')
      instructions.textContent = "The action is being performed. Please wait a few moments and then press 'Done and refresh widget'"
      const openExternal = document.createElement('a')
      openExternal.href = taskUrl
      openExternal.target = '_blank'
      openExternal.rel = 'noopener noreferrer'
      openExternal.textContent = 'Open task in new tab'
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
            if (iframeEl) iframeEl.src = widgetWrapper.dataset.url || iframeEl.src
          }
        } catch (error) {
          logger.error('Error refreshing widget iframe:', error)
          showNotification('Failed to refresh widget')
        }
      })
      modal.append(instructions, openExternal, iframe, minimizeButton, doneButton)
    }
  })
}

/**
 * Append a stable task session id to ttyd URL args.
 * @param {string} url
 * @param {string} sessionId
 * @returns {string}
 */
function withTaskSessionArg (url, sessionId) {
  try {
    const parsed = new URL(url, window.location.origin)
    const args = parsed.searchParams.getAll('arg')
    if (args[0] !== 'asd') return parsed.toString()
    const hasSession = args.some(arg => arg.startsWith('--session='))
    if (!hasSession) parsed.searchParams.append('arg', `--session=${sessionId}`)
    return parsed.toString()
  } catch {
    return url
  }
}
