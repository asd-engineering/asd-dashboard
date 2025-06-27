import { Logger } from '../../utils/Logger.js'

const logger = new Logger('notification.js')

// Function to generate a UUID (simple version)
function generateUUID () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0; const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Function to show a temporary message like alert with dismiss options
export function showNotification (message, duration = 3000) {
  // Remove any existing notifications to avoid duplicates during tests
  document.querySelectorAll('.user-notification').forEach(el => {
    try {
      el.remove()
    } catch (e) {
      logger.error('Error removing old notification:', e)
    }
  })
  // Generate a unique ID for the dialog
  const dialogId = generateUUID()

  // Create the dialog element dynamically
  const dialog = document.createElement('dialog')
  dialog.setAttribute('id', dialogId)
  dialog.className = 'user-notification' // Apply the notification style

  // Create the close (cancel) button
  const closeButton = document.createElement('button')
  closeButton.className = 'close-button'
  closeButton.innerHTML = '&times;' // Use an "×" symbol for close

  // Append the message and close button to the dialog
  const messageElement = document.createElement('span')
  messageElement.textContent = message // Add the message as plain text

  dialog.appendChild(messageElement)
  dialog.appendChild(closeButton)

  // Append the dialog to the body
  document.body.appendChild(dialog)

  // Show the dialog
  dialog.show()
  logger.log('Notification displayed with message:', message)

  // Add the "show" class for animation
  setTimeout(() => {
    dialog.classList.add('show')
  }, 10) // Slight delay to trigger the animation

  // Function to hide and remove the notification
  const hideNotification = () => {
    dialog.classList.remove('show') // Hide the notification smoothly
    setTimeout(function () {
      dialog.close()
      dialog.remove() // Remove the dialog from the DOM
    }, 300) // Wait for the hide transition to complete before removing
  }

  // Automatically close and remove the dialog after the specified duration
  const autoCloseTimeout = setTimeout(hideNotification, duration)

  // Add event listener to the close button
  closeButton.addEventListener('click', () => {
    clearTimeout(autoCloseTimeout) // Clear the auto-close timeout
    hideNotification() // Manually close
  })

  // Add event listener for the ESC key to close the notification
  document.addEventListener('keydown', function escKeyListener (event) {
    if (event.key === 'Escape') {
      clearTimeout(autoCloseTimeout) // Clear the auto-close timeout
      hideNotification() // Manually close
      document.removeEventListener('keydown', escKeyListener) // Remove event listener
    }
  })
}
