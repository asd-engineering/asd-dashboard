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

  // Backdrop
  const backdrop = document.createElement('div')
  backdrop.id = 'config-backdrop'
  backdrop.style.position = 'fixed'
  backdrop.style.top = 0
  backdrop.style.left = 0
  backdrop.style.width = '100vw'
  backdrop.style.height = '100vh'
  backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'
  backdrop.style.display = 'flex'
  backdrop.style.justifyContent = 'center'
  backdrop.style.alignItems = 'center'
  backdrop.style.zIndex = 10000

  // Modal
  const modal = document.createElement('div')
  modal.id = 'config-modal'
  modal.setAttribute('role', 'dialog')
  modal.style.backgroundColor = '#fff'
  modal.style.padding = '2rem'
  modal.style.borderRadius = '8px'
  modal.style.maxHeight = '80vh'
  modal.style.overflowY = 'auto'
  modal.style.minWidth = '300px'

  // Config JSON editor
  const textarea = document.createElement('textarea')
  textarea.id = 'config-json'
  textarea.value = JSON.stringify(configData, null, 2)
  modal.appendChild(textarea)

  // Buttons
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

  // Append modal to backdrop, then to body
  backdrop.appendChild(modal)
  document.body.appendChild(backdrop)

  window.addEventListener('click', handleOutsideClick)
  window.addEventListener('keydown', handleEscapeKey)
}

export function closeConfigModal () {
  const backdrop = document.getElementById('config-backdrop')
  if (backdrop) {
    backdrop.remove()
  }
  window.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('keydown', handleEscapeKey)
}

function handleOutsideClick (event) {
  const backdrop = document.getElementById('config-backdrop')
  if (event.target === backdrop) {
    closeConfigModal()
  }
}

function handleEscapeKey (event) {
  if (event.key === 'Escape') {
    closeConfigModal()
  }
}
