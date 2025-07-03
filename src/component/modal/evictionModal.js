// @ts-check
/**
 * Modal dialog prompting which widget to evict when the widgetStore is full.
 *
 * @module evictionModal
 */
import { openModal } from './modalFactory.js'

/**
 * Display a modal to choose a widget for removal.
 *
 * @param {Map<string, HTMLElement>} widgets - Current widget map.
 * @function openEvictionModal
 * @returns {Promise<string|null>} Resolves with selected widget id or null if cancelled.
 */
export function openEvictionModal (widgets) {
  return new Promise((resolve) => {
    openModal({
      id: 'eviction-modal',
      showCloseIcon: false,
      onCloseCallback: () => resolve(null),
      buildContent: (modal, closeModal) => {
        const msg = document.createElement('p')
        msg.textContent = 'Select a widget to remove:'

        const select = document.createElement('select')
        select.id = 'eviction-select'
        for (const [id, el] of widgets.entries()) {
          let label = id
          if (el.dataset.metadata) {
            try {
              label = JSON.parse(el.dataset.metadata).title || id
            } catch {}
          }
          const opt = document.createElement('option')
          opt.value = id
          opt.textContent = label
          select.appendChild(opt)
        }

        const removeBtn = document.createElement('button')
        removeBtn.textContent = 'Remove'
        removeBtn.classList.add('modal__btn', 'modal__btn--save')
        removeBtn.addEventListener('click', () => {
          closeModal()
          resolve(select.value)
        })

        const cancelBtn = document.createElement('button')
        cancelBtn.textContent = 'Cancel'
        cancelBtn.classList.add('modal__btn', 'modal__btn--cancel')
        cancelBtn.addEventListener('click', () => {
          closeModal()
          resolve(null)
        })

        const btnGroup = document.createElement('div')
        btnGroup.classList.add('modal__btn-group')
        btnGroup.append(removeBtn, cancelBtn)

        modal.append(msg, select, btnGroup)
      }
    })
  })
}
