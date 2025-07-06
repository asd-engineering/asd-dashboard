// @ts-check
/**
 * Modal prompting to save a URL as a named service.
 *
 * @module saveServiceModal
 */
import { openModal } from './modalFactory.js'
import { load, save } from '../../storage/servicesStore.js'
import { addWidget } from '../widget/widgetManagement.js'
import { refreshRowCounts, updateWidgetCounter } from '../menu/widgetSelectorPanel.js'
import { getCurrentBoardId, getCurrentViewId } from '../../utils/elements.js'

/**
 * Open a modal to create or edit a service definition.
 *
 * @param {object} options - Modal configuration.
 * @param {'new'|'edit'} [options.mode]
 * @param {import('../../types.js').Service} [options.service]
 * @param {string} [options.url]
 * @param {Function} [options.onClose]
 * @function openSaveServiceModal
 * @returns {void}
 */
export function openSaveServiceModal (options, onCloseDeprecated) {
  if (typeof options === 'string') {
    openSaveServiceModal({ url: options, mode: 'new', onClose: onCloseDeprecated })
    return
  }
  const { mode = 'new', service = null, url = '', onClose } = options || {}

  openModal({
    id: 'save-service-modal',
    onCloseCallback: onClose,
    buildContent: (modal, closeModal) => {
      const nameInput = document.createElement('input')
      nameInput.id = 'service-name'
      nameInput.classList.add('modal__input')
      nameInput.placeholder = 'Name'
      nameInput.value = service?.name || ''

      const categoryInput = document.createElement('input')
      categoryInput.id = 'service-category'
      categoryInput.classList.add('modal__input')
      categoryInput.placeholder = 'Category'
      categoryInput.value = service?.category || ''

      const subcategoryInput = document.createElement('input')
      subcategoryInput.id = 'service-subcategory'
      subcategoryInput.classList.add('modal__input')
      subcategoryInput.placeholder = 'Subcategory'
      subcategoryInput.value = service?.subcategory || ''

      const tagsInput = document.createElement('input')
      tagsInput.id = 'service-tags'
      tagsInput.classList.add('modal__input')
      tagsInput.placeholder = 'Tags comma separated'
      tagsInput.value = service?.tags?.join(',') || ''

      const urlInput = document.createElement('input')
      urlInput.id = 'service-url'
      urlInput.classList.add('modal__input')
      urlInput.placeholder = 'URL'
      urlInput.value = service?.url || url

      const maxInput = document.createElement('input')
      maxInput.id = 'service-max'
      maxInput.classList.add('modal__input')
      maxInput.type = 'number'
      maxInput.placeholder = 'Max instances'
      if (service?.maxInstances !== undefined) maxInput.value = String(service.maxInstances)

      const startCheck = document.createElement('input')
      startCheck.type = 'checkbox'
      startCheck.id = 'service-start'

      const startLabel = document.createElement('label')
      startLabel.textContent = 'Start in current board'
      startLabel.htmlFor = 'service-start'

      const startWrap = document.createElement('div')
      startWrap.append(startCheck, startLabel)

      modal.append(
        nameInput,
        categoryInput,
        subcategoryInput,
        tagsInput,
        urlInput,
        maxInput,
        startWrap
      )

      const saveButton = document.createElement('button')
      saveButton.textContent = 'Save'
      saveButton.classList.add('modal__btn', 'modal__btn--save')
      saveButton.addEventListener('click', async () => {
        const nameVal = nameInput.value.trim()
        const urlVal = urlInput.value.trim()
        if (!nameVal || !urlVal) return
        const services = load()

        if (mode === 'edit' && service) {
          const idx = services.findIndex(s => s.name === service.name && s.url === service.url)
          if (idx !== -1) {
            const oldName = services[idx].name
            services[idx] = {
              ...services[idx],
              name: nameVal,
              url: urlVal,
              category: categoryInput.value.trim() || undefined,
              subcategory: subcategoryInput.value.trim() || undefined,
              tags: tagsInput.value.split(',').map(t => t.trim()).filter(Boolean),
              maxInstances: maxInput.value ? Number(maxInput.value) : undefined
            }
            save(services)
            if (oldName !== nameVal) {
              document.querySelectorAll('.widget-wrapper').forEach(el => {
                const hw = /** @type {HTMLElement} */(el)
                if (hw.dataset.service === oldName) hw.dataset.service = nameVal
              })
              const boards = JSON.parse(localStorage.getItem('boards') || '[]')
              boards.forEach(b => {
                b.views.forEach(v => {
                  v.widgetState.forEach(w => {
                    if (w.type === oldName) w.type = nameVal
                  })
                })
              })
              localStorage.setItem('boards', JSON.stringify(boards))
            }
            document.dispatchEvent(new CustomEvent('services-updated'))
          }
        } else {
          const newService = {
            name: nameVal,
            url: urlVal,
            category: categoryInput.value.trim() || undefined,
            subcategory: subcategoryInput.value.trim() || undefined,
            tags: tagsInput.value.split(',').map(t => t.trim()).filter(Boolean),
            maxInstances: maxInput.value ? Number(maxInput.value) : undefined
          }
          services.push(newService)
          save(services)
          document.dispatchEvent(new CustomEvent('services-updated'))
          if (startCheck.checked) {
            await addWidget(urlVal, 1, 1, 'iframe', getCurrentBoardId(), getCurrentViewId())
            refreshRowCounts()
            updateWidgetCounter()
          }
        }
        closeModal()
      })

      const cancelButton = document.createElement('button')
      cancelButton.textContent = 'Cancel'
      cancelButton.classList.add('modal__btn', 'modal__btn--cancel')
      cancelButton.addEventListener('click', closeModal)

      const btnGroup = document.createElement('div')
      btnGroup.classList.add('modal__btn-group')
      btnGroup.append(saveButton, cancelButton)
      modal.appendChild(btnGroup)
    }
  })
}
