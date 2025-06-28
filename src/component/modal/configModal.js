import { openModal } from './modalFactory.js'
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
    widget: { minColumns: 1, maxColumns: 8, minRows: 1, maxRows: 6 }
  }
}

const logger = new Logger('configModal.js')

export function openConfigModal () {
  const stored = localStorage.getItem('config')
  const configData = stored ? JSON.parse(stored) : DEFAULT_CONFIG_TEMPLATE

  openModal({
    id: 'config-modal',
    onCloseCallback: () => logger.log('Config modal closed'),
    buildContent: (modal, closeModal) => {
      const textarea = document.createElement('textarea')
      textarea.id = 'config-json'
      textarea.value = JSON.stringify(configData, null, 2)
      modal.appendChild(textarea)

      const saveButton = document.createElement('button')
      saveButton.textContent = 'Save'
      saveButton.classList.add('lsm-save-button')
      saveButton.addEventListener('click', () => {
        try {
          const cfg = JSON.parse(textarea.value)
          localStorage.setItem('config', JSON.stringify(cfg))
          showNotification('Config saved to localStorage')
          closeModal()
          setTimeout(() => location.reload(), 500)
        } catch (e) {
          logger.error('Invalid JSON:', e)
          showNotification('Invalid JSON format', 3000, 'error')
        }
      })

      const closeButton = document.createElement('button')
      closeButton.textContent = 'Close'
      closeButton.classList.add('lsm-cancel-button')
      closeButton.addEventListener('click', closeModal)

      const buttonContainer = document.createElement('div')
      buttonContainer.append(saveButton, closeButton)
      modal.appendChild(buttonContainer)
    }
  })
}
