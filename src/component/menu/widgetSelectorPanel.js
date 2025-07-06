// @ts-check
/**
 * Widget selector panel logic.
 *
 * @module widgetSelectorPanel
 */
import { addWidget, removeWidget } from '../widget/widgetManagement.js'
import * as servicesStore from '../../storage/servicesStore.js'
import { getCurrentBoardId, getCurrentViewId } from '../../utils/elements.js'
import emojiList from '../../ui/unicodeEmoji.js'

/**
 * Update the Active/Max counter in the panel.
 * @function updateWidgetCounter
 * @returns {void}
 */
export function updateWidgetCounter () {
  const counter = document.getElementById('widget-count')
  if (!counter) return
  const boards = window.asd.boards || []
  const total = boards.reduce((sum, b) =>
    sum + b.views.reduce((s, v) => s + v.widgetState.length, 0), 0)
  const max = window.asd.config?.globalSettings?.maxTotalInstances
  counter.textContent = `Active: ${total} / Max: ${typeof max === 'number' ? max : '∞'}`
}

/**
 * Populate dropdown list with saved services.
 * @function populateWidgetSelectorPanel
 * @returns {void}
 */
export function populateWidgetSelectorPanel () {
  const container = document.querySelector('#widget-selector-panel .dropdown-content')
  if (!container) return
  container.innerHTML = ''
  const newItem = document.createElement('div')
  newItem.textContent = 'New Service'
  newItem.className = 'widget-option new-service'
  container.appendChild(newItem)
  servicesStore.load().forEach(service => {
    const item = document.createElement('div')
    item.className = 'widget-option'
    item.dataset.url = service.url
    item.dataset.name = service.name
    if (service.category) item.dataset.category = service.category
    if (Array.isArray(service.tags)) item.dataset.tags = service.tags.join(',')
    const label = document.createElement('span')
    label.textContent = service.name
    const actions = document.createElement('span')
    actions.className = 'widget-option-actions'

    const editBtn = document.createElement('button')
    editBtn.textContent = emojiList.edit.unicode
    editBtn.dataset.action = 'edit'

    const removeBtn = document.createElement('button')
    removeBtn.textContent = emojiList.cross.unicode
    removeBtn.dataset.action = 'remove'

    const navBtn = document.createElement('button')
    navBtn.textContent = emojiList.link.unicode
    navBtn.dataset.action = 'navigate'

    actions.append(editBtn, removeBtn, navBtn)
    item.append(label, actions)
    container.appendChild(item)
  })
  updateWidgetCounter()
}

/**
 * Set up click handler for selecting services.
 * @function initializeWidgetSelectorPanel
 * @returns {void}
 */
export function initializeWidgetSelectorPanel () {
  const panel = document.getElementById('widget-selector-panel')
  if (!panel) return
  panel.addEventListener('click', event => {
    const target = /** @type {?HTMLElement} */(event.target)
    if (!target) return
    const item = target.closest('.widget-option')
    if (!(item instanceof HTMLElement)) return
    const action = target.dataset.action
    const url = item.dataset.url
    const name = item.dataset.name

    if (action === 'edit' && url && name) {
      const svc = servicesStore.load().find(s => s.url === url && s.name === name)
      if (svc) {
        import('../modal/editServiceModal.js').then(m => m.openEditServiceModal(svc))
      }
      return
    }

    if (action === 'remove' && url && name) {
      if (confirm('Remove this service and all its widgets?')) {
        document.querySelectorAll('.widget-wrapper').forEach(el => {
          if (el instanceof HTMLElement && el.dataset.service === name) {
            removeWidget(el)
          }
        })
        const boards = window.asd.boards || []
        let changed = false
        boards.forEach(b => {
          b.views.forEach(v => {
            const before = v.widgetState.length
            v.widgetState = v.widgetState.filter(w => w.url !== url)
            if (v.widgetState.length !== before) changed = true
          })
        })
        if (changed) localStorage.setItem('boards', JSON.stringify(boards))
        const updated = servicesStore.load().filter(s => !(s.url === url && s.name === name))
        servicesStore.save(updated)
        document.dispatchEvent(new CustomEvent('services-updated'))
        updateWidgetCounter()
      }
      return
    }

    if (action === 'navigate' && url) {
      window.open(url, '_blank')
      return
    }

    if (item.classList.contains('new-service')) {
      const entered = prompt('Enter service URL:')
      if (!entered) return
      import('../modal/saveServiceModal.js').then(m => {
        m.openSaveServiceModal(entered, () => {
          servicesStore.load()
          populateWidgetSelectorPanel()
          addWidget(entered, 1, 1, 'iframe', getCurrentBoardId(), getCurrentViewId())
        })
      })
      return
    }
    if (url) {
      addWidget(url, 1, 1, 'iframe', getCurrentBoardId(), getCurrentViewId())
      updateWidgetCounter()
    }
  })

  const search = panel.querySelector('#widget-search')
  if (search instanceof HTMLInputElement) {
    search.addEventListener('input', event => {
      const term = (/** @type {HTMLInputElement} */(event.target)).value.toLowerCase()
      panel.querySelectorAll('.widget-option').forEach(el => {
        const item = /** @type {HTMLElement} */(el)
        if (item.classList.contains('new-service')) return
        const name = item.dataset.name?.toLowerCase() || ''
        const category = item.dataset.category?.toLowerCase() || ''
        const tags = item.dataset.tags?.toLowerCase() || ''
        const match = !term || name.includes(term) || category.includes(term) || tags.includes(term)
        item.style.display = match ? '' : 'none'
      })
    })
  }
}
