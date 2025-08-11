// src/component/modal/editServiceModal.js
// @ts-check
/**
 * Modal dialog for editing a saved service.
 *
 * @module editServiceModal
 */
import { openModal } from './modalFactory.js'
import StorageManager from '../../storage/StorageManager.js'

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
      nameInput.placeholder = 'Name'
      nameInput.value = service.name

      const urlInput = document.createElement('input')
      urlInput.id = 'edit-service-url'
      urlInput.classList.add('modal__input')
      urlInput.placeholder = 'URL'
      urlInput.value = service.url

      modal.append(nameInput, urlInput)

      const saveBtn = document.createElement('button')
      saveBtn.textContent = 'Save'
      saveBtn.classList.add('modal__btn', 'modal__btn--save')
      saveBtn.addEventListener('click', () => {
        const nameVal = nameInput.value.trim()
        const urlVal = urlInput.value.trim()
        if (!nameVal || !urlVal) return

        const services = StorageManager.getServices() || []
        const idx = services.findIndex(s => s.name === service.name && s.url === service.url)
        if (idx !== -1) {
          const oldName = services[idx].name
          // Preserve other fields; only update name/url
          services[idx] = {
            ...services[idx],
            name: nameVal,
            url: urlVal
          }
          StorageManager.setServices(services)

          // If name changed: update any DOM widget metadata and persisted boards.type
          if (oldName !== nameVal) {
            document.querySelectorAll('.widget-wrapper').forEach(el => {
              const hw = /** @type {HTMLElement} */ (el)
              if (hw.dataset.service === oldName) hw.dataset.service = nameVal
            })
            StorageManager.updateBoards(boards => {
              boards.forEach(b => {
                b.views.forEach(v => {
                  v.widgetState.forEach(w => {
                    if (w.type === oldName) w.type = nameVal
                  })
                })
              })
            })
          }

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
