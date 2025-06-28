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
  const backdrop = document.getElementById('localStorage-backdrop')
  if (backdrop) {
    document.body.removeChild(backdrop)
  }
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
  const backdrop = document.createElement('div')
  backdrop.id = 'localStorage-backdrop'
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

  const modal = document.createElement('div')
  modal.id = 'localStorage-modal'
  modal.style.backgroundColor = '#fff'
  modal.style.padding = '2rem'
  modal.style.borderRadius = '8px'
  modal.style.maxHeight = '80vh'
  modal.style.overflowY = 'auto'
  modal.style.minWidth = '300px'

  // Append modal to backdrop
  backdrop.appendChild(modal)
  document.body.appendChild(backdrop)

  Object.keys(data).forEach(key => {
    const label = document.createElement('label')
    label.textContent = `Key: ${key}`

    const input = document.createElement('textarea')
    input.value = JSON.stringify(data[key], null, 2)
    input.id = `localStorage-${key}`

    modal.appendChild(label)
    modal.appendChild(input)
  })

  const saveButton = document.createElement('button')
  saveButton.textContent = 'Save'
  saveButton.addEventListener('click', () => {
    const updatedData = {}
    let hasInvalid = false

    Object.keys(data).forEach(key => {
      const input = document.getElementById(`localStorage-${key}`).value

      if (isJSON(input)) {
        updatedData[key] = JSON.parse(input)
      } else {
        showNotification(`Invalid JSON detected in editor for key: ${key}. Please correct this value.`)
        hasInvalid = true
      }
    })

    if (hasInvalid) {
      logger.warn('Aborting save due to invalid JSON entries')
      return
    }

    saveLocalStorageData(updatedData)
    showNotification('LocalStorage updated successfully!')
    setTimeout(() => {
      location.reload()
    }, 600)
  })

  const buttonContainer = document.createElement('div')
  const closeButton = document.createElement('button')
  closeButton.textContent = 'Close'
  closeButton.classList.add('lsm-cancel-button')
  closeButton.onclick = closeLocalStorageModal

  saveButton.classList.add('lsm-save-button')
  buttonContainer.appendChild(saveButton)
  buttonContainer.appendChild(closeButton)
  modal.appendChild(buttonContainer)

  // Listen to backdrop click
  window.addEventListener('click', handleOutsideClick)
  window.addEventListener('keydown', handleEscapeKey)
}

function handleOutsideClick (event) {
  const backdrop = document.getElementById('localStorage-backdrop')

  if (event.target === backdrop) {
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
