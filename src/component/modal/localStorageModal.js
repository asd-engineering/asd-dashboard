import { showNotification } from '../dialog/notification.js'
import { Logger } from '../../utils/Logger.js'

const logger = new Logger('localStorageModal.js')

export function openLocalStorageModal () {
  // Check if the modal already exists
  if (document.getElementById('localStorage-modal')) {
    logger.log('LocalStorage modal is already open')
    return
  }

  logger.log('Opening LocalStorage modal')
  try {
    const localStorageData = getLocalStorageData()
    renderLocalStorageModal(localStorageData)
  } catch (error) {
    showNotification(error.message)
  }
}

export function closeLocalStorageModal () {
  logger.log('Closing LocalStorage modal')
  const modal = document.getElementById('localStorage-modal')
  if (modal) {
    document.body.removeChild(modal)
  }
  // Remove event listeners if necessary
  window.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('keydown', handleEscapeKey)
}

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

function renderLocalStorageModal (data) {
  const modal = document.createElement('div')
  modal.id = 'localStorage-modal'
  document.body.appendChild(modal)

  Object.keys(data).forEach(key => {
    const label = document.createElement('label')
    label.textContent = `Key: ${key}`

    const input = document.createElement('textarea')
    input.value = JSON.stringify(data[key], null, 2) // Prettified JSON
    input.id = `localStorage-${key}`

    modal.appendChild(label)
    modal.appendChild(input)
  })

  const saveButton = document.createElement('button')
  saveButton.textContent = 'Save'
  saveButton.addEventListener('click', () => {
    const updatedData = {}

    Object.keys(data).forEach(key => {
      const input = document.getElementById(`localStorage-${key}`).value

      if (isJSON(input)) {
        updatedData[key] = JSON.parse(input)
      } else {
        showNotification(`Invalid JSON detected in editor for key: ${key}. Please correct this value.`)
      }
    })

    saveLocalStorageData(updatedData)
    showNotification('LocalStorage updated successfully!')
    setTimeout(() => {
      location.reload()
    }, 600) // Wait 1 second before reloading
  })

  const buttonContainer = document.createElement('div')
  const closeButton = document.createElement('button')
  closeButton.textContent = 'Close'
  closeButton.classList.add('lsm-cancel-button') // Added class
  closeButton.onclick = closeLocalStorageModal

  saveButton.classList.add('lsm-save-button') // Added class
  buttonContainer.appendChild(saveButton)
  buttonContainer.appendChild(closeButton)
  modal.appendChild(buttonContainer)

  // Event listener for closing the modal by clicking outside
  window.addEventListener('click', handleOutsideClick)

  // Event listener for closing the modal by pressing 'Escape'
  window.addEventListener('keydown', handleEscapeKey)
}

function handleOutsideClick (event) {
  const modal = document.getElementById('localStorage-modal')
  if (event.target === modal) {
    closeLocalStorageModal()
  }
}

function handleEscapeKey (event) {
  if (event.key === 'Escape') {
    closeLocalStorageModal()
  }
}

function saveLocalStorageData (updatedData) {
  for (const key in updatedData) {
    const value = updatedData[key]
    localStorage.setItem(key, JSON.stringify(value))
  }
}
