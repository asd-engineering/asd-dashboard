// @ts-check
/**
 * Modal dialog for editing the application configuration.
 *
 * @module configModal
 */
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

/**
 * Open a modal dialog allowing the user to edit and save configuration JSON.
 *
 * @function openConfigModal
 * @returns {void}
 */
export function openConfigModal () {
  const storedConfig = localStorage.getItem('config')
  const storedBoards = localStorage.getItem('boards')
  const configData = storedConfig ? JSON.parse(storedConfig) : { ...DEFAULT_CONFIG_TEMPLATE }

  if (storedBoards) {
    try {
      const boards = JSON.parse(storedBoards)
      if (Array.isArray(boards)) {
        configData.boards = boards
      }
    } catch (e) {
      logger.error('Failed to parse boards from localStorage:', e)
    }
  }

  openModal({
    id: 'config-modal',
    onCloseCallback: () => logger.log('Config modal closed'),
    buildContent: (modal, closeModal) => {
      const textarea = document.createElement('textarea')
      textarea.id = 'config-json'
      textarea.classList.add('modal__textarea--grow')
      textarea.value = JSON.stringify(configData, null, 2)
      modal.appendChild(textarea)

      const saveButton = document.createElement('button')
      saveButton.textContent = 'Save'
      saveButton.classList.add('modal__btn', 'modal__btn--save')
      saveButton.addEventListener('click', () => {
        try {
          const cfg = JSON.parse(textarea.value)
          localStorage.setItem('config', JSON.stringify(cfg))

          if (Array.isArray(cfg.boards)) {
            localStorage.setItem('boards', JSON.stringify(cfg.boards))
          } else {
            localStorage.removeItem('boards')
          }

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
      closeButton.classList.add('modal__btn', 'modal__btn--cancel')
      closeButton.addEventListener('click', closeModal)

      const buttonContainer = document.createElement('div')
      buttonContainer.classList.add('modal__btn-group')
      buttonContainer.append(saveButton, closeButton)
      modal.appendChild(buttonContainer)
    }
  })
}
