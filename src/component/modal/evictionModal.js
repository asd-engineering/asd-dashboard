// @ts-check
/**
 * Modal dialog prompting which widget to evict when the widgetStore is full.
 * @module evictionModal
 */
import { openModal } from './modalFactory.js'
import { header, subtext, disclaimer } from './evictionCopy.js'
import { createEvictionViewModel } from './evictionModalViewModel.js'
import { showNotification } from '../dialog/notification.js'
import { Logger } from '../../utils/Logger.js'

const logger = new Logger('evictionModal.js')

/**
 * Open the eviction modal.
 * @param {{
 *  reason:string,
 *  maxPerService:number,
 *  requiredCount:number|null,
 *  items:Array<{id:string,title:string,icon:string,boardIndex:number,viewIndex:number,lruRank:number}>,
 *  onEvict:(ids:string[])=>Promise<void>
 * }} opts
 * @returns {Promise<boolean>}
 */
export function openEvictionModal (opts) {
  const vm = createEvictionViewModel(opts)
  return new Promise(resolve => {
    let settled = false
    const finalize = (val) => {
      if (settled) return
      settled = true
      resolve(val)
    }
    openModal({
      id: 'eviction-modal',
      showCloseIcon: false,
      onCloseCallback: () => finalize(false),
      buildContent: (modal, closeModal) => {
        const headerEl = document.createElement('h2')
        headerEl.id = 'eviction-header'
        headerEl.textContent = header(vm.selectionLimit)

        const subEl = document.createElement('p')
        subEl.id = 'eviction-subtext'
        subEl.textContent = subtext(vm.maxPerService)

        const discEl = document.createElement('p')
        discEl.id = 'eviction-disclaimer'
        discEl.textContent = disclaimer

        modal.setAttribute('aria-labelledby', headerEl.id)
        modal.setAttribute('aria-describedby', `${subEl.id} ${discEl.id}`)

        const list = document.createElement('div')
        list.id = 'eviction-list'
        list.style.maxHeight = '200px'
        list.style.overflowY = 'auto'

        /** @type {Map<string,HTMLInputElement>} */
        const cbMap = new Map()
        for (const item of vm.items) {
          const label = document.createElement('label')
          const cb = document.createElement('input')
          cb.type = 'checkbox'
          cb.value = item.id
          const text = document.createElement('span')
          text.textContent = `${item.icon} ${item.title} — Board ${item.boardIndex + 1}, View ${item.viewIndex + 1}`
          label.append(cb, text)
          list.appendChild(label)
          cbMap.set(item.id, cb)

          cb.addEventListener('change', () => {
            const removed = vm.toggle(item.id)
            if (removed) {
              const old = cbMap.get(removed)
              if (old) old.checked = false
            }
            update()
          })
        }

        const counter = document.createElement('p')
        counter.id = 'eviction-counter'

        const autoBtn = document.createElement('button')
        autoBtn.id = 'evict-lru-btn'
        autoBtn.textContent = 'Auto-select LRU'
        autoBtn.classList.add('modal__btn')
        autoBtn.disabled = vm.items.length === 0
        autoBtn.addEventListener('click', async () => {
          const picked = vm.autoSelectLru()
          for (const [id, cb] of cbMap) {
            cb.checked = vm.state.selected.has(id)
          }
          update()
          await pipeline(picked, 'lru')
        })

        const continueBtn = document.createElement('button')
        continueBtn.textContent = 'Continue'
        continueBtn.classList.add('modal__btn', 'modal__btn--save')
        if (vm.items.length === 0) {
          continueBtn.style.display = 'none'
        } else {
          continueBtn.disabled = true
        }
        continueBtn.addEventListener('click', async () => {
          const ids = Array.from(vm.state.selected)
          await pipeline(ids, 'manual')
        })

        const cancelBtn = document.createElement('button')
        cancelBtn.textContent = 'Cancel'
        cancelBtn.classList.add('modal__btn', 'modal__btn--cancel')
        cancelBtn.addEventListener('click', () => {
          finalize(false)
          closeModal()
        })

        const btnGroup = document.createElement('div')
        btnGroup.classList.add('modal__btn-group')
        btnGroup.append(autoBtn, continueBtn, cancelBtn)

        modal.append(headerEl, subEl, discEl, list, counter, btnGroup)

        const update = () => {
          counter.textContent = `${vm.state.selected.size} of ${vm.selectionLimit} widgets selected`
          if (vm.items.length > 0) continueBtn.disabled = !vm.state.canProceed
          for (const cb of cbMap.values()) {
            const disable = vm.state.canProceed && !cb.checked
            cb.disabled = disable
            cb.parentElement.style.opacity = disable ? '0.5' : ''
          }
        }
        update()

        const focusable = modal.querySelectorAll('button, input')
        if (focusable.length) {
          focusable[0].focus()
          modal.addEventListener('keydown', e => {
            if (e.key === 'Tab') {
              const first = focusable[0]
              const last = focusable[focusable.length - 1]
              if (e.shiftKey && document.activeElement === first) {
                last.focus()
                e.preventDefault()
              } else if (!e.shiftKey && document.activeElement === last) {
                first.focus()
                e.preventDefault()
              }
            }
          })
        }

        /**
         * Eviction pipeline executing removal and logging.
         * @param {string[]} ids
         * @param {'lru'|'manual'} via
         * @returns {Promise<void>}
         */
        async function pipeline (ids, via) {
          try {
            await opts.onEvict(Array.from(new Set(ids)))
            logger.log('evict', { reason: vm.reason, requiredCount: vm.requiredCount, selectedCount: ids.length, via })
            finalize(true)
            closeModal()
          } catch {
            showNotification('Could not remove one or more widgets', 3000, 'error')
          }
        }
      }
    })
  })
}

export default openEvictionModal
