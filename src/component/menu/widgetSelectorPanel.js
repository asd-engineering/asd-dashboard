// @ts-check
/**
 * Widget selector panel logic.
 *
 * @module widgetSelectorPanel
 */
import { addWidget } from '../widget/widgetManagement.js'
import * as servicesStore from '../../storage/servicesStore.js'
import { getCurrentBoardId, getCurrentViewId } from '../../utils/elements.js'

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
    item.textContent = service.name
    item.className = 'widget-option'
    item.dataset.url = service.url
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
    const url = item.dataset.url
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
}
