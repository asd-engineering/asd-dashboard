// @ts-check
/**
 * Modal dialog prompting which widget to evict when the widgetStore is full.
 *
 * @module evictionModal
 */
import { openModal } from './modalFactory.js'
import emojiList from '../../ui/unicodeEmoji.js'

/**
 * Display a modal to choose a widget for removal.
 *
 * @param {Map<string, HTMLElement>} widgets - Current widget map.
 * @function openEvictionModal
 * @returns {Promise<{id:string, title:string}|null>} Resolves with selected widget info or null.
 */
export function openEvictionModal (widgets) {
  return new Promise((resolve) => {
    let settled = false
    const finalize = (result) => {
      if (settled) return
      settled = true
      resolve(result)
    }
    openModal({
      id: 'eviction-modal',
      showCloseIcon: false,
      onCloseCallback: () => finalize(null),
      buildContent: (modal, closeModal) => {
        const msg = document.createElement('p')
        msg.textContent = 'Select a widget to remove:'

        const select = document.createElement('select')
        select.id = 'eviction-select'
        for (const [id, el] of widgets.entries()) {
          let title = id
          if (el.dataset.metadata) {
            try {
              title = JSON.parse(el.dataset.metadata).title || id
            } catch {}
          }
          const service = el.dataset.service || ''
          const key = service.toLowerCase().split('asd-')[1] || service.toLowerCase()
          const emoji = emojiList[key]?.unicode || '🧱'
          const label = `${emoji} ${service} – ${title}`
          const opt = document.createElement('option')
          opt.value = id
          opt.textContent = label
          select.appendChild(opt)
        }

        const removeBtn = document.createElement('button')
        removeBtn.textContent = 'Remove'
        removeBtn.classList.add('modal__btn', 'modal__btn--save')
        removeBtn.addEventListener('click', () => {
          finalize({ id: select.value, title: select.selectedOptions[0].textContent || '' })
          closeModal()
        })

        const cancelBtn = document.createElement('button')
        cancelBtn.textContent = 'Cancel'
        cancelBtn.classList.add('modal__btn', 'modal__btn--cancel')
        cancelBtn.addEventListener('click', () => {
          finalize(null)
          closeModal()
        })

        const btnGroup = document.createElement('div')
        btnGroup.classList.add('modal__btn-group')
        btnGroup.append(removeBtn, cancelBtn)

        modal.append(msg, select, btnGroup)
      }
    })
  })
}
