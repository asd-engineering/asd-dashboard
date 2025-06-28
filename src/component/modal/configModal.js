import { showNotification } from '../dialog/notification.js'
import { Logger } from '../../utils/Logger.js'

export const DEFAULT_CONFIG_TEMPLATE = {
  globalSettings: {
    theme: 'light',
    widgetStoreUrl: [],
    database: 'localStorage',
    localStorage: {
      enabled: 'true',
      loadDashboardFromConfig: 'true'
    }
  },
  boards: [],
  styling: {
    widget: { minColumns: 1, maxColumns: 4, minRows: 1, maxRows: 4 }
  }
}

const logger = new Logger('configModal.js')

export function openConfigModal () {
  const stored = localStorage.getItem('config')
  const configData = stored ? JSON.parse(stored) : DEFAULT_CONFIG_TEMPLATE

  if (document.getElementById('config-modal')) return

  logger.log('Opening config modal')
  const modal = document.createElement('div')
  modal.id = 'config-modal'
  modal.setAttribute('role', 'dialog')

  const textarea = document.createElement('textarea')
  textarea.id = 'config-json'
  textarea.value = JSON.stringify(configData, null, 2)
  modal.appendChild(textarea)

  const saveButton = document.createElement('button')
  saveButton.textContent = 'Save'
  saveButton.addEventListener('click', () => {
    try {
      const cfg = JSON.parse(textarea.value)
      localStorage.setItem('config', JSON.stringify(cfg))
      showNotification('Config saved to localStorage')
      closeConfigModal()
      setTimeout(() => location.reload(), 500)
    } catch (e) {
      logger.error('Invalid JSON in config modal:', e)
      showNotification('Invalid JSON format')
    }
  })

  const closeButton = document.createElement('button')
  closeButton.textContent = 'Close'
  closeButton.classList.add('lsm-cancel-button')
  closeButton.onclick = closeConfigModal

  const buttonContainer = document.createElement('div')
  buttonContainer.appendChild(saveButton)
  buttonContainer.appendChild(closeButton)
  modal.appendChild(buttonContainer)

  document.body.appendChild(modal)

  window.addEventListener('click', handleOutsideClick)
  window.addEventListener('keydown', handleEscapeKey)
}

export function closeConfigModal () {
  const modal = document.getElementById('config-modal')
  if (modal) {
    modal.remove()
  }
  window.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('keydown', handleEscapeKey)
}

function handleOutsideClick (event) {
  const modal = document.getElementById('config-modal')
  if (event.target === modal) {
    closeConfigModal()
  }
}

function handleEscapeKey (event) {
  if (event.key === 'Escape') {
    closeConfigModal()
  }
}
