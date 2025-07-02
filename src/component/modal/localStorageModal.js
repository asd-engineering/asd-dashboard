// @ts-check
/**
 * Modal dialog for viewing and editing `localStorage` entries.
 *
 * @module localStorageModal
 */
import { openModal } from './modalFactory.js'
import { showNotification } from '../dialog/notification.js'
import { Logger } from '../../utils/Logger.js'

const logger = new Logger('localStorageModal.js')

/**
 * Checks if a given string is valid JSON.
 * @function isJSON
 * @param {string} value - The string to check.
 * @returns {boolean} True if the string is valid JSON, false otherwise.
 */
function isJSON (value) {
  try {
    JSON.parse(value)
    logger.log('Valid JSON:', value)
    return true
  } catch (e) {
    logger.error('Invalid JSON:', value)
    return false
  }
}

/**
 * Retrieves and parses all JSON-formatted items from localStorage.
 * @function getLocalStorageData
 * @returns {Record<string, any>} An object containing the parsed localStorage data.
 */
function getLocalStorageData () {
  const localStorageData = {}

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    const value = localStorage.getItem(key)
    logger.log(`Checking key: ${key}, value: ${value}`)

    if (isJSON(value)) {
      localStorageData[key] = JSON.parse(value)
    } else {
      logger.warn(`Non-JSON value detected for key: ${key}. This entry will not be editable in the modal.`)
    }
  }

  return localStorageData
}

/**
 * Saves a data object to localStorage, serializing each value to a JSON string.
 * @function saveLocalStorageData
 * @param {Record<string, any>} updatedData - The data to save.
 * @returns {void}
 */
function saveLocalStorageData (updatedData) {
  for (const key in updatedData) {
    const value = updatedData[key]
    localStorage.setItem(key, JSON.stringify(value))
  }
}

/**
 * Display a modal to inspect and modify `localStorage` keys.
 *
 * @function openLocalStorageModal
 * @returns {void}
 */
export function openLocalStorageModal () {
  openModal({
    id: 'localStorage-modal',
    onCloseCallback: () => logger.log('LocalStorage modal closed'),
    buildContent: (modal, closeModal) => {
      const data = getLocalStorageData()
      for (const [key, value] of Object.entries(data)) {
        if (key.includes('swEnabled') || key.includes('config')) continue

        const label = document.createElement('label')
        label.classList.add('modal__label')
        label.textContent = `Key: ${key}`

        const input = document.createElement('textarea')
        input.id = `localStorage-${key}`
        input.classList.add('modal__textarea', 'modal__textarea--grow')
        input.value = JSON.stringify(value, null, 2)

        modal.append(label, input)
      }

      const saveButton = document.createElement('button')
      saveButton.textContent = 'Save'
      saveButton.classList.add('modal__btn', 'modal__btn--save')
      saveButton.addEventListener('click', () => {
        const updated = {}
        let invalid = false
        for (const [key] of Object.entries(data)) {
          if (key.includes('swEnabled') || key.includes('config')) continue
          const textarea = /** @type {HTMLTextAreaElement} */(document.getElementById(`localStorage-${key}`))
          const val = textarea.value
          try {
            updated[key] = JSON.parse(val)
          } catch {
            showNotification(`Invalid JSON detected in key: ${key}`, 3000, 'error')
            invalid = true
          }
        }
        if (invalid) {
          logger.warn('Save aborted due to invalid JSON')
          return
        }
        saveLocalStorageData(updated)
        showNotification('LocalStorage updated successfully!')
        closeModal()
        setTimeout(() => location.reload(), 600)
      })

      const closeButton = document.createElement('button')
      closeButton.textContent = 'Close'
      closeButton.classList.add('modal__btn', 'modal__btn--cancel')
      closeButton.addEventListener('click', closeModal)

      const btnContainer = document.createElement('div')
      btnContainer.classList.add('modal__btn-group')
      btnContainer.append(saveButton, closeButton)
      modal.appendChild(btnContainer)
    }
  })
}
