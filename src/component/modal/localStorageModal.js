import { openModal } from './modalFactory.js'
import { showNotification } from '../dialog/notification.js'
import { Logger } from '../../utils/Logger.js'

const logger = new Logger('localStorageModal.js')

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

function saveLocalStorageData (updatedData) {
  for (const key in updatedData) {
    const value = updatedData[key]
    localStorage.setItem(key, JSON.stringify(value))
  }
}

export function openLocalStorageModal () {
  openModal({
    id: 'localStorage-modal',
    onCloseCallback: () => logger.log('LocalStorage modal closed'),
    buildContent: (modal, closeModal) => {
      const data = getLocalStorageData()
      Object.entries(data).forEach(([key, value]) => {
        const label = document.createElement('label')
        label.textContent = `Key: ${key}`
        const input = document.createElement('textarea')
        input.id = `localStorage-${key}`
        input.value = JSON.stringify(value, null, 2)
        modal.append(label, input)
      })

      const saveButton = document.createElement('button')
      saveButton.textContent = 'Save'
      saveButton.classList.add('lsm-save-button')
      saveButton.addEventListener('click', () => {
        const updated = {}
        let invalid = false
        Object.keys(data).forEach(key => {
          const val = document.getElementById(`localStorage-${key}`).value
          try {
            updated[key] = JSON.parse(val)
          } catch {
            showNotification(`Invalid JSON detected in key: ${key}`)
            invalid = true
          }
        })
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
      closeButton.classList.add('lsm-cancel-button')
      closeButton.addEventListener('click', closeModal)

      const btnContainer = document.createElement('div')
      btnContainer.append(saveButton, closeButton)
      modal.appendChild(btnContainer)
    }
  })
}
