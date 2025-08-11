// src/component/menu/widgetSelectorPanel.js
// @ts-check
/**
 * Widget selector panel logic — StorageManager-based.
 *
 * @module widgetSelectorPanel
 */
import { addWidget, removeWidget, findFirstLocationByServiceName } from '../widget/widgetManagement.js'
import { widgetStore } from '../widget/widgetStore.js'
import { switchBoard } from '../board/boardManagement.js'
import { getCurrentBoardId, getCurrentViewId } from '../../utils/elements.js'
import StorageManager from '../../storage/StorageManager.js'
import emojiList from '../../ui/unicodeEmoji.js'
import { resolveServiceConfig } from '../../utils/serviceUtils.js'
import { showNotification } from '../dialog/notification.js'

/**
 * Emit a standardized state change event.
 * @param {'config'|'services'|string} reason
 */
function emitStateChange (reason) {
  document.dispatchEvent(new CustomEvent('state-change', { detail: { reason } }))
}

/**
 * Compute total widgets across all boards/views from persisted state.
 * @returns {number}
 */
function getGlobalWidgetTotal () {
  const boards = StorageManager.getBoards() || []
  return boards.reduce(
    (sum, b) => sum + (b.views || []).reduce((s, v) => s + ((v.widgetState || []).length), 0),
    0
  )
}

/**
 * Count active instances for a given service URL across persisted state.
 * @param {string} url
 * @returns {number}
 */
function countServiceInstances (url) {
  const boards = StorageManager.getBoards() || []
  return boards.reduce(
    (c, b) => c + (b.views || []).reduce(
      (s, v) => s + (v.widgetState || []).filter(w => w.url === url).length, 0
    ),
    0
  )
}

/**
 * Update the Global/Max counter in the panel.
 * @function updateWidgetCounter
 * @returns {void}
 */
export function updateWidgetCounter () {
  const counter = document.getElementById('widget-count')
  if (!counter) return

  const total = getGlobalWidgetTotal()

  // Max comes from widgetStore first (runtime cap), then config fallback.
  const cfg = StorageManager.getConfig()
  const maxFromConfig = cfg?.globalSettings?.maxTotalInstances
  const max =
    (typeof widgetStore?.maxSize === 'number' ? widgetStore.maxSize : null) ??
    (typeof maxFromConfig === 'number' ? maxFromConfig : null)

  counter.textContent = `Global: ${total} / Max: ${max !== null ? max : '∞'}`
}

/**
 * Open the widget selector panel for automated tests.
 * @function __openForTests
 * @returns {void}
 */
export function __openForTests () {
  const panel = document.getElementById('widget-selector-panel')
  panel?.classList.add('open')
}

// Expose a stable test hook used by tests/shared/common.ensurePanelOpen()
/* eslint-disable no-underscore-dangle */
window.__openWidgetPanel = __openForTests
/* eslint-enable no-underscore-dangle */

/**
 * Update the instance count labels for each service row and enforce limits.
 * @function refreshRowCounts
 * @returns {void}
 */
export function refreshRowCounts () {
  const container = document.querySelector('#widget-selector-panel .dropdown-content')
  if (!container) return

  const services = StorageManager.getServices() || []
  const overGlobal = typeof widgetStore.maxSize === 'number' && widgetStore.widgets.size >= widgetStore.maxSize

  services.forEach(service => {
    const resolved = resolveServiceConfig(service)
    const item = container.querySelector(`.widget-option[data-name="${resolved.name}"]`)
    if (!(item instanceof HTMLElement)) return

    const label = item.querySelector('.widget-option-label')
    const cnt = item.querySelector('.widget-option-count')
    if (!(label instanceof HTMLElement) || !(cnt instanceof HTMLElement)) return

    const activeCount = countServiceInstances(resolved.url)
    const max = resolved.maxInstances ?? '∞'

    // Update text
    label.firstChild && (label.firstChild.nodeValue = resolved.name)
    cnt.textContent = ` (${activeCount}/${max})`

    // Apply limit state
    const overService = typeof resolved.maxInstances === 'number' && activeCount >= resolved.maxInstances

    // ToDo: Add visual queue to the interface
    if (overGlobal || overService) {
      item.classList.add('limit-reached')
    } else {
      item.classList.remove('limit-reached')
    }
    item.dataset.url = resolved.url
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

  // "Create new" affordance
  const newItem = document.createElement('div')
  newItem.textContent = '➕ Create New Widget'
  newItem.className = 'widget-option new-service'
  container.appendChild(newItem)

  const services = StorageManager.getServices() || []
  const overGlobal = typeof widgetStore.maxSize === 'number' && widgetStore.widgets.size >= widgetStore.maxSize

  services.forEach(service => {
    const resolved = resolveServiceConfig(service)
    const item = document.createElement('div')
    item.className = 'widget-option'
    item.dataset.name = resolved.name
    if (resolved.category) item.dataset.category = resolved.category
    if (resolved.subcategory) item.dataset.subcategory = resolved.subcategory
    if (Array.isArray(resolved.tags)) item.dataset.tags = resolved.tags.join(',')

    const activeCount = countServiceInstances(resolved.url)
    const max = resolved.maxInstances ?? '∞'
    const overService = typeof resolved.maxInstances === 'number' && activeCount >= resolved.maxInstances
    if (!overService && !overGlobal) item.dataset.url = resolved.url

    const label = document.createElement('span')
    label.className = 'widget-option-label'
    label.textContent = resolved.name

    const cnt = document.createElement('span')
    cnt.className = 'widget-option-count'
    cnt.textContent = ` (${activeCount}/${max})`
    label.append(cnt)

    item.dataset.label = resolved.name

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

let __panelInitialized = false

/**
 * Set up click/search/keyboard handlers for the selector.
 * @function initializeWidgetSelectorPanel
 * @returns {void}
 */
export function initializeWidgetSelectorPanel () {
  if (__panelInitialized) return
  __panelInitialized = true

  const panel = document.getElementById('widget-selector-panel')
  if (!panel) return

  const toggle = panel.querySelector('#widget-dropdown-toggle')
  const search = panel.querySelector('#widget-search')
  let focusIndex = -1

  const closePanel = () => {
    panel.classList.remove('open')
    focusIndex = -1
    panel.querySelectorAll('.widget-option').forEach(el => el.classList.remove('active'))
  }

  const openPanel = () => {
    panel.classList.add('open')
  }

  panel.addEventListener('click', async event => {
    if (!panel.classList.contains('open')) panel.classList.add('open')

    const target = /** @type {?HTMLElement} */(event.target)
    if (!target) return
    const item = target.closest('.widget-option')
    if (!(item instanceof HTMLElement)) return

    const action = target.dataset.action
    const url = item.dataset.url
    const name = item.dataset.name

    // Edit service metadata
    if (action === 'edit' && name) {
      const svc = (StorageManager.getServices() || []).find(s => s.name === name)
      if (svc) {
        const mod = await import('../modal/saveServiceModal.js')
        mod.openSaveServiceModal({ mode: 'edit', service: svc })
      }
      return
    }

    // Remove service and all its widgets
    if (action === 'remove' && name) {
      // eslint-disable-next-line no-alert
      if (confirm('Remove this service and all its widgets?')) {
        // Remove widgets in DOM
        document.querySelectorAll('.widget-wrapper').forEach(async el => {
          if (el instanceof HTMLElement && el.dataset.service === name) {
            await removeWidget(el)
          }
        })
        // Remove from persisted boards
        StorageManager.updateBoards(boards => {
          boards.forEach(b => {
            b.views.forEach(v => {
              v.widgetState = (v.widgetState || []).filter(w => w.url !== url)
            })
          })
        })
        // Remove from services list
        const updated = (StorageManager.getServices() || []).filter(s => !(s.url === url && s.name === name))
        StorageManager.setServices(updated)

        // Standardized event; let main.js own the refresh pipeline.
        emitStateChange('services')
      }
      return
    }

    // Navigate to first matching widget location
    if (action === 'navigate' && name) {
      const location = findFirstLocationByServiceName(name)
      if (location) {
        await switchBoard(location.boardId, location.viewId)
        showNotification(`Navigated to view containing '${name}' widget.`)
      } else {
        showNotification(`Could not find a '${name}' widget in any view.`, 3000, 'error')
      }
      closePanel()
      return
    }

    // Create new service via modal
    if (item.classList.contains('new-service')) {
      const mod = await import('../modal/saveServiceModal.js')
      mod.openSaveServiceModal({ mode: 'new', url: '' })
      return
    }

    // Add widget for selected service
    if (url) {
      await addWidget(url, 1, 1, 'iframe', getCurrentBoardId(), getCurrentViewId())
      // Adding a widget changes state (counts/limits). Broadcast once.
      emitStateChange('services')
    }
    closePanel()
  })

  // Live filtering + keyboard nav
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
      const options = Array.from(panel.querySelectorAll('.widget-option'))
        .filter(el => el instanceof HTMLElement && el.style.display !== 'none')
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

  // Bridge legacy 'services-updated' to standardized 'state-change:services'
  document.addEventListener('services-updated', () => {
    emitStateChange('services')
  })

  // React to standardized state changes from anywhere (incl. main.js)
  document.addEventListener('state-change', (e) => {
    const reason = /** @type {CustomEvent} */(e).detail?.reason
    if (reason === 'services' || reason === 'config') {
      populateWidgetSelectorPanel()
      refreshRowCounts()
      updateWidgetCounter()
    }
  })
}
