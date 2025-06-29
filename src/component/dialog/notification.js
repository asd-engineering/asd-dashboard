/**
 * Simple notification dialog utilities.
 *
 * @module notification
 */
import { Logger } from '../../utils/Logger.js'
import { getUUID } from '../../utils/utils.js'

const logger = new Logger('notification.js')

/**
 * Display a temporary notification message.
 *
 * @param {string} message - Text content of the notification.
 * @param {number} [duration=3000] - How long to display the notification.
 * @param {('success'|'error')} [type='success'] - Visual style of the message.
 * @function showNotification
 * @returns {void}
 */
export function showNotification (message, duration = 3000, type = 'success') {
  const dialogId = getUUID()

  const dialog = document.createElement('dialog')
  dialog.setAttribute('id', dialogId)
  dialog.className = `user-notification ${type === 'error' ? 'error' : 'success'}`

  const closeButton = document.createElement('button')
  closeButton.className = 'close-button'
  closeButton.innerHTML = '&times;'

  const messageElement = document.createElement('span')
  messageElement.textContent = message

  dialog.appendChild(messageElement)
  dialog.appendChild(closeButton)
  document.body.appendChild(dialog)

  dialog.show()
  logger.log(`Notification (${type}) displayed with message:`, message)

  setTimeout(() => {
    dialog.classList.add('show')
  }, 10)

  const hideNotification = () => {
    dialog.classList.remove('show')
    setTimeout(() => {
      dialog.close()
      dialog.remove()
    }, 300)
  }

  const autoCloseTimeout = setTimeout(hideNotification, duration)

  closeButton.addEventListener('click', () => {
    clearTimeout(autoCloseTimeout)
    hideNotification()
  })

  document.addEventListener('keydown', function escKeyListener (event) {
    if (event.key === 'Escape') {
      clearTimeout(autoCloseTimeout)
      hideNotification()
      document.removeEventListener('keydown', escKeyListener)
    }
  })
}
