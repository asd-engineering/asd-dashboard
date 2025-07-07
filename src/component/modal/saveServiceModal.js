// @ts-check
/**
 * Modal prompting to save a URL as a named service.
 *
 * @module saveServiceModal
 */
import { openModal } from './modalFactory.js'
import StorageManager from '../../storage/StorageManager.js'

/**
 * Open a modal allowing the user to name and store a service URL.
 *
 * @param {string} url - The service URL to save.
 * @param {Function} onClose - Callback when the modal closes.
 * @function openSaveServiceModal
 * @returns {void}
 */
export function openSaveServiceModal (url, onClose) {
  openModal({
    id: 'save-service-modal',
    onCloseCallback: onClose,
    buildContent: (modal, closeModal) => {
      const message = document.createElement('p')
      message.textContent = 'Do you want to save this URL as a reusable service?'
      const input = document.createElement('input')
      input.type = 'text'
      input.placeholder = 'Service name'
      input.required = true
      input.id = 'save-service-name'
      input.classList.add('modal__input')
      modal.append(message, input)

      const saveButton = document.createElement('button')
      saveButton.classList.add('modal__btn')
      saveButton.textContent = 'Save & Close'
      saveButton.addEventListener('click', () => {
        const name = input.value.trim()
        if (!name) return
        const services = StorageManager.getServices()
        services.push({ name, url })
        StorageManager.setServices(services)
        document.dispatchEvent(new CustomEvent('services-updated'))
        closeModal()
      })

      const skipButton = document.createElement('button')
      skipButton.textContent = 'Skip'
      skipButton.classList.add('modal__btn', 'modal__btn--cancel')
      skipButton.addEventListener('click', closeModal)

      const btnContainer = document.createElement('div')
      btnContainer.classList.add('modal__btn-group')
      btnContainer.append(saveButton, skipButton)
      modal.appendChild(btnContainer)
    }
  })
}
