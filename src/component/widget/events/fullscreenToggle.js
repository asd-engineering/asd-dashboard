/**
 * Utility to toggle a widget into a full-screen display mode.
 *
 * @module fullscreenToggle
 */
import { Logger } from '../../../utils/Logger.js'

const logger = new Logger('fullscreenToggle.js')

/**
 * Toggle the given widget element between fullscreen and normal size.
 *
 * @param {HTMLElement} widget - The widget wrapper to modify.
 * @function toggleFullScreen
 * @returns {void}
 */
function toggleFullScreen (widget) {
  const isFullScreen = widget.classList.contains('fullscreen')

  if (isFullScreen) {
    widget.classList.remove('fullscreen')
    document.removeEventListener('keydown', handleEscapeKey)
    logger.log('Exited full-screen mode')
  } else {
    widget.classList.add('fullscreen')
    document.addEventListener('keydown', handleEscapeKey)
    logger.log('Entered full-screen mode')
  }
}

/**
 * Exit fullscreen when the user presses the Escape key.
 *
 * @param {KeyboardEvent} event - Keydown event.
 * @function handleEscapeKey
 * @returns {void}
 */
function handleEscapeKey (event) {
  if (event.key === 'Escape') {
    const fullScreenWidget = document.querySelector('.widget-wrapper.fullscreen')
    if (fullScreenWidget) {
      toggleFullScreen(fullScreenWidget)
    }
  }
}

export { toggleFullScreen }
