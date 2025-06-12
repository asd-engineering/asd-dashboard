import { Logger } from '../../../utils/Logger.js'

const logger = new Logger('fullscreenToggle.js')

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

function handleEscapeKey (event) {
  if (event.key === 'Escape') {
    const fullScreenWidget = document.querySelector('.widget-wrapper.fullscreen')
    if (fullScreenWidget) {
      toggleFullScreen(fullScreenWidget)
    }
  }
}

export { toggleFullScreen }
