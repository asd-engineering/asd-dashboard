import { showNotification } from '../dialog/notification.js'
import { Logger } from '../../utils/Logger.js'

const logger = new Logger('configModal.js')

export function openConfigModal (initialConfig = '') {
  if (document.getElementById('config-modal')) {
    logger.log('Config modal already open')
    return
  }

  const modal = document.createElement('div')
  modal.id = 'config-modal'
  document.body.appendChild(modal)

  const textarea = document.createElement('textarea')
  textarea.id = 'config-json'
  textarea.value = initialConfig
  modal.appendChild(textarea)

  const buttonContainer = document.createElement('div')

  const saveButton = document.createElement('button')
  saveButton.textContent = 'Save'
  saveButton.addEventListener('click', () => {
    try {
      const config = JSON.parse(textarea.value)
      localStorage.setItem('config', JSON.stringify(config))
      window.asd.config = config
      location.reload()
    } catch (err) {
      logger.error('Invalid JSON provided in config modal')
      showNotification('Invalid JSON, please correct and try again')
    }
  })

  const closeButton = document.createElement('button')
  closeButton.textContent = 'Close'
  closeButton.classList.add('lsm-cancel-button')
  closeButton.addEventListener('click', () => {
    modal.remove()
  })

  buttonContainer.appendChild(saveButton)
  buttonContainer.appendChild(closeButton)
  modal.appendChild(buttonContainer)

  // allow closing with escape
  const escListener = e => {
    if (e.key === 'Escape') {
      modal.remove()
      window.removeEventListener('keydown', escListener)
    }
  }
  window.addEventListener('keydown', escListener)
}
