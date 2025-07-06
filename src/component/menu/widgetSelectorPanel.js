// @ts-check
/**
 * Widget selector panel logic.
 *
 * @module widgetSelectorPanel
 */
import { addWidget, removeWidget, findWidgetLocation } from '../widget/widgetManagement.js'
import { widgetStore } from '../widget/widgetStore.js'
import { switchBoard } from '../board/boardManagement.js'
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
 * Update the instance count labels for each service row.
 * @function refreshRowCounts
 * @returns {void}
 */
export function refreshRowCounts () {
  const container = document.querySelector('#widget-selector-panel .dropdown-content')
  if (!container) return
  const services = servicesStore.load()
  const overGlobal = widgetStore.widgets.size >= widgetStore.maxSize
  services.forEach(service => {
    const item = container.querySelector(`.widget-option[data-name="${service.name}"]`)
    if (!(item instanceof HTMLElement)) return
    const label = item.querySelector('span')
    if (!(label instanceof HTMLElement)) return
    const activeCount = (window.asd.boards || []).reduce((c, b) =>
      c + b.views.reduce((s, v) => s + v.widgetState.filter(w => w.url === service.url).length, 0), 0)
    const max = service.maxInstances ?? '∞'
    label.textContent = `${service.name} (${activeCount}/${max})`
    const overService = typeof service.maxInstances === 'number' && activeCount >= service.maxInstances
    if (overGlobal || overService) {
      item.removeAttribute('data-url')
      item.classList.add('limit-reached')
    } else {
      item.dataset.url = service.url
      item.classList.remove('limit-reached')
    }
  })
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
  newItem.textContent = '➕ Create New Widget'
  newItem.className = 'widget-option new-service'
  container.appendChild(newItem)
  servicesStore.load().forEach(service => {
    const item = document.createElement('div')
    item.className = 'widget-option'
    item.dataset.name = service.name
    if (service.category) item.dataset.category = service.category
    if (service.subcategory) item.dataset.subcategory = service.subcategory
    if (Array.isArray(service.tags)) item.dataset.tags = service.tags.join(',')
    const activeCount = (window.asd.boards || []).reduce((c, b) =>
      c + b.views.reduce((s, v) => s + v.widgetState.filter(w => w.url === service.url).length, 0), 0)
    const max = service.maxInstances ?? '∞'
    const overService = typeof service.maxInstances === 'number' && activeCount >= service.maxInstances
    const overGlobal = widgetStore.widgets.size >= widgetStore.maxSize
    if (!overService && !overGlobal) item.dataset.url = service.url
    const label = document.createElement('span')
    label.textContent = `${service.name} (${activeCount}/${max})`
    const actions = document.createElement('span')
    actions.className = 'widget-option-actions'

    const navBtn = document.createElement('button')
    navBtn.textContent = emojiList.magnifyingGlass.unicode
    navBtn.dataset.action = 'navigate'
    navBtn.title = 'Locate widget'
    navBtn.setAttribute('aria-label', 'Locate widget')

    const editBtn = document.createElement('button')
    editBtn.textContent = emojiList.edit.unicode
    editBtn.dataset.action = 'edit'
    editBtn.title = 'Edit widget'
    editBtn.setAttribute('aria-label', 'Edit widget')

    const removeBtn = document.createElement('button')
    removeBtn.textContent = emojiList.cross.unicode
    removeBtn.dataset.action = 'remove'
    removeBtn.title = 'Delete widget type'
    removeBtn.setAttribute('aria-label', 'Delete widget type')

    actions.append(navBtn, editBtn, removeBtn)
    item.append(label, actions)
    container.appendChild(item)
  })
  refreshRowCounts()
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

  const toggle = panel.querySelector('#widget-dropdown-toggle')
  const search = panel.querySelector('#widget-search')
  let focusIndex = -1

  const closePanel = () => {
    panel.classList.remove('open')
    focusIndex = -1
    panel.querySelectorAll('.widget-option').forEach(el => {
      el.classList.remove('active')
    })
  }

  const openPanel = () => {
    panel.classList.add('open')
  }

  panel.addEventListener('click', async event => {
    const target = /** @type {?HTMLElement} */(event.target)
    if (!target) return
    const item = target.closest('.widget-option')
    if (!(item instanceof HTMLElement)) return
    const action = target.dataset.action
    const url = item.dataset.url
    const name = item.dataset.name

    if (action === 'edit' && name) {
      const svc = servicesStore.load().find(s => s.name === name)
      if (svc) {
        import('../modal/saveServiceModal.js').then(m => m.openSaveServiceModal({ mode: 'edit', service: svc }))
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
        refreshRowCounts()
        updateWidgetCounter()
      }
      return
    }

    if (action === 'navigate' && name) {
      const el = widgetStore.findFirstWidgetByService(name)
      if (el) {
        const loc = findWidgetLocation(el.dataset.dataid)
        if (loc) switchBoard(loc.boardId, loc.viewId)
      }
      closePanel()
      refreshRowCounts()
      updateWidgetCounter()
      return
    }

    if (item.classList.contains('new-service')) {
      import('../modal/saveServiceModal.js').then(m => m.openSaveServiceModal({ mode: 'new', url: '' }))
      return
    }
    if (url) {
      await addWidget(url, 1, 1, 'iframe', getCurrentBoardId(), getCurrentViewId())
      refreshRowCounts()
      updateWidgetCounter()
    }
    closePanel()
  })

  if (search instanceof HTMLInputElement) {
    search.addEventListener('focus', openPanel)
    search.addEventListener('input', event => {
      const term = (/** @type {HTMLInputElement} */(event.target)).value.toLowerCase()
      panel.querySelectorAll('.widget-option').forEach(el => {
        const item = /** @type {HTMLElement} */(el)
        if (item.classList.contains('new-service')) return
        const name = item.dataset.name?.toLowerCase() || ''
        const category = item.dataset.category?.toLowerCase() || ''
        const subcategory = item.dataset.subcategory?.toLowerCase() || ''
        const tags = item.dataset.tags?.toLowerCase() || ''
        const match = !term || name.includes(term) || category.includes(term) || subcategory.includes(term) || tags.includes(term)
        item.style.display = match ? '' : 'none'
      })
      focusIndex = -1
    })
    search.addEventListener('keydown', e => {
      if (!panel.classList.contains('open')) return
      const options = Array.from(panel.querySelectorAll('.widget-option')).filter(el => el instanceof HTMLElement && el.style.display !== 'none')
      if (options.length === 0) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        focusIndex = Math.min(options.length - 1, focusIndex + 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        focusIndex = Math.max(0, focusIndex - 1)
      } else if (e.key === 'Enter' && focusIndex >= 0) {
        e.preventDefault()
        const el = /** @type {HTMLElement} */(options[focusIndex])
        el.click()
        return
      } else {
        return
      }
      options.forEach((el, idx) => {
        el.classList.toggle('active', idx === focusIndex)
      })
    })
  }

  if (toggle instanceof HTMLElement) {
    toggle.addEventListener('click', () => {
      panel.classList.toggle('open')
    })
  }

  document.addEventListener('click', event => {
    const target = /** @type {Node} */(event.target)
    if (!panel.contains(target)) closePanel()
  })

  document.addEventListener('services-updated', () => {
    populateWidgetSelectorPanel()
    refreshRowCounts()
    updateWidgetCounter()
  })
}
