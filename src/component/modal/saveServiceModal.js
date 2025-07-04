// @ts-check
/**
 * Modal prompting to save a URL as a named service.
 *
 * @module saveServiceModal
 */
import { openModal } from './modalFactory.js'
import { load, save } from '../../storage/servicesStore.js'

/**
 * Open a modal allowing the user to name and store a service URL.
 *
 * @param {string} [url=''] - Optional service URL to prefill.
 * @param {Function} [onClose] - Callback when the modal closes.
 * @function openSaveServiceModal
 * @returns {void}
 */
export function openSaveServiceModal (url = '', onClose) {
  openModal({
    id: 'save-service-modal',
    onCloseCallback: onClose,
    buildContent: (modal, closeModal) => {
      const urlInput = document.createElement('input')
      urlInput.type = 'text'
      urlInput.placeholder = 'Service URL'
      urlInput.required = true
      urlInput.id = 'save-service-url'
      urlInput.classList.add('modal__input')
      urlInput.value = url

      const nameInput = document.createElement('input')
      nameInput.type = 'text'
      nameInput.placeholder = 'Service name'
      nameInput.required = true
      nameInput.id = 'save-service-name'
      nameInput.classList.add('modal__input')

      modal.append(urlInput, nameInput)

      const saveButton = document.createElement('button')
      saveButton.classList.add('modal__btn')
      saveButton.textContent = 'Save & Close'
      saveButton.addEventListener('click', () => {
        const name = nameInput.value.trim()
        const serviceUrl = urlInput.value.trim()
        if (!name || !serviceUrl) return
        const services = load()
        services.push({ name, url: serviceUrl })
        save(services)
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
