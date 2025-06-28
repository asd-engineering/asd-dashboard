import { openModal } from './modalFactory.js'
import { load, save } from '../../storage/servicesStore.js'

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
      modal.append(message, input)

      const saveButton = document.createElement('button')
      saveButton.textContent = 'Save & Close'
      saveButton.addEventListener('click', () => {
        const name = input.value.trim()
        if (!name) return
        const services = load()
        services.push({ name, url })
        save(services)
        document.dispatchEvent(new CustomEvent('services-updated'))
        closeModal()
      })

      const skipButton = document.createElement('button')
      skipButton.textContent = 'Skip'
      skipButton.addEventListener('click', closeModal)

      const btnContainer = document.createElement('div')
      btnContainer.append(saveButton, skipButton)
      modal.appendChild(btnContainer)
    }
  })
}
