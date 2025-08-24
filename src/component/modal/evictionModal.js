// @ts-check
/**
 * Modal dialog prompting which widget to evict when the widgetStore is full.
 *
 * @module evictionModal
 */
import { openModal } from './modalFactory.js'
import emojiList from '../../ui/unicodeEmoji.js'

/**
 * Display a modal to choose widgets for removal.
 *
 * @param {Map<string, HTMLElement>} widgets - Current widget map.
 * @param {number} count - Number of widgets that must be removed.
 * @function openEvictionModal
 * @returns {Promise<Array<{id:string, title:string}>|null>} Resolves with selected widget info or null.
 */
export function openEvictionModal (widgets, count) {
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
        const plural = count === 1 ? 'widget must' : `${count} widgets must`
        const msg = document.createElement('p')
        msg.textContent = `${plural} be removed to continue navigation.`

        const list = document.createElement('div')
        list.id = 'eviction-list'

        /** @type {HTMLInputElement[]} */
        const checkboxes = []
        /** @type {Map<string,string>} */
        const selected = new Map()

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

          let friendlyName = title
          if (title === id && service) {
            friendlyName = service
          }
          const label = `${emoji} ${friendlyName}`

          const wrapper = document.createElement('label')
          const cb = document.createElement('input')
          cb.type = 'checkbox'
          cb.value = id
          cb.dataset.label = label
          wrapper.append(cb, ` ${label}`)
          list.appendChild(wrapper)
          checkboxes.push(cb)

          cb.addEventListener('change', () => {
            if (cb.checked) {
              selected.set(cb.value, cb.dataset.label || '')
            } else {
              selected.delete(cb.value)
            }
            updateState()
          })
        }

        const counter = document.createElement('p')
        counter.id = 'eviction-counter'

        const updateState = () => {
          const selCount = selected.size
          counter.textContent = `${selCount} of ${count} widgets selected`
          removeBtn.disabled = selCount !== count
          for (const cb of checkboxes) {
            cb.disabled = selCount === count && !cb.checked
          }
        }

        const autoBtn = document.createElement('button')
        autoBtn.id = 'evict-lru-btn'
        autoBtn.textContent = 'Auto-select LRU'
        autoBtn.classList.add('modal__btn')
        autoBtn.addEventListener('click', () => {
          selected.clear()
          for (const cb of checkboxes) {
            cb.checked = false
            cb.disabled = false
          }
          checkboxes.slice(0, count).forEach(cb => {
            cb.checked = true
            selected.set(cb.value, cb.dataset.label || '')
          })
          updateState()
        })

        const removeBtn = document.createElement('button')
        removeBtn.textContent = 'Remove'
        removeBtn.classList.add('modal__btn', 'modal__btn--save')
        removeBtn.disabled = true
        removeBtn.addEventListener('click', () => {
          const result = Array.from(selected, ([id, title]) => ({ id, title }))
          finalize(result)
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
        btnGroup.append(autoBtn, removeBtn, cancelBtn)

        modal.append(msg, list, counter, btnGroup)
        updateState()
      }
    })
  })
}
