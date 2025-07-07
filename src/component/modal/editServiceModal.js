// @ts-check
/**
 * Modal dialog for editing a saved service.
 *
 * @module editServiceModal
 */
import { openModal } from './modalFactory.js'
import * as servicesStore from '../../storage/servicesStore.js'

/**
 * Open a modal allowing the user to edit a service definition.
 *
 * @param {import('../../types.js').Service} service - Service to edit.
 * @param {Function} [onClose] - Callback when modal closes.
 * @function openEditServiceModal
 * @returns {void}
 */
export function openEditServiceModal (service, onClose) {
  openModal({
    id: 'edit-service-modal',
    onCloseCallback: onClose,
    buildContent: (modal, closeModal) => {
      const nameInput = document.createElement('input')
      nameInput.id = 'edit-service-name'
      nameInput.classList.add('modal__input')
      nameInput.value = service.name

      const urlInput = document.createElement('input')
      urlInput.id = 'edit-service-url'
      urlInput.classList.add('modal__input')
      urlInput.value = service.url

      modal.append(nameInput, urlInput)

      const saveBtn = document.createElement('button')
      saveBtn.textContent = 'Save'
      saveBtn.classList.add('modal__btn', 'modal__btn--save')
      saveBtn.addEventListener('click', () => {
        const services = servicesStore.load()
        const idx = services.findIndex(s => s.name === service.name && s.url === service.url)
        if (idx !== -1) {
          services[idx] = { ...service, name: nameInput.value.trim(), url: urlInput.value.trim() }
          servicesStore.save(services)
          document.dispatchEvent(new CustomEvent('services-updated'))
        }
        closeModal()
      })

      const cancelBtn = document.createElement('button')
      cancelBtn.textContent = 'Cancel'
      cancelBtn.classList.add('modal__btn', 'modal__btn--cancel')
      cancelBtn.addEventListener('click', closeModal)

      const btnGroup = document.createElement('div')
      btnGroup.classList.add('modal__btn-group')
      btnGroup.append(saveBtn, cancelBtn)
      modal.appendChild(btnGroup)
    }
  })
}
