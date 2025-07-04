// @ts-check
/**
 * Menu actions for adding widgets and switching boards/views.
 *
 * @module dashboardMenu
 */
import { addWidget } from '../widget/widgetManagement.js'
import { openSaveServiceModal } from '../modal/saveServiceModal.js'
import * as servicesStore from '../../storage/servicesStore.js'
import {
  switchBoard,
  switchView,
  updateViewSelector
} from '../../component/board/boardManagement.js'
import { saveWidgetState } from '../../storage/localStorage.js'
import { getCurrentBoardId, getCurrentViewId } from '../../utils/elements.js'
import { showNotification } from '../dialog/notification.js'
import emojiList from '../../ui/unicodeEmoji.js'
import { Logger } from '../../utils/Logger.js'
import { clearConfigFragment } from '../../utils/fragmentGuard.js'
import { debounceLeading } from '../../utils/utils.js'

const logger = new Logger('dashboardMenu.js')

let uiInitialized = false // Guard variable

/**
 * Set up event handlers for the dashboard menu and populate service options.
 *
 * @function initializeDashboardMenu
 * @returns {void}
 */
function initializeDashboardMenu () {
  if (uiInitialized) return // Guard clause
  uiInitialized = true

  logger.log('Dashboard menu initialized')
  populateServiceDropdown()
  document.addEventListener('services-updated', populateServiceDropdown)
  applyWidgetMenuVisibility()

  const buttonDebounce = 200

  const handleToggleWidgetMenu = debounceLeading(() => {
    const widgetContainer = document.getElementById('widget-container')
    const toggled = widgetContainer.classList.toggle('hide-widget-menu') // true if now hidden

    const message = toggled
      ? `${emojiList.cross.unicode} Widget menu hidden`
      : `${emojiList.edit.unicode} Widget menu shown`

    if (window.asd && window.asd.config && window.asd.config.globalSettings) {
      window.asd.config.globalSettings.showMenuWidget = !toggled
      localStorage.setItem('config', JSON.stringify(window.asd.config))
    }

    showNotification(message, 500)
  }, buttonDebounce)
  document.getElementById('toggle-widget-menu').addEventListener('click', /** @type {EventListener} */(handleToggleWidgetMenu))

  const handleReset = debounceLeading(() => {
    // Show confirmation dialog
    const confirmed = confirm('Confirm environment reset: all configurations and services will be permanently deleted.')

    if (confirmed) {
      localStorage.clear()
      clearConfigFragment()
      location.reload()
    }
  }, buttonDebounce)
  document.getElementById('reset-button').addEventListener('click', /** @type {EventListener} */(handleReset))

  document.getElementById('board-selector').addEventListener('change', (event) => {
    const target = /** @type {HTMLSelectElement} */(event.target)
    const selectedBoardId = target.value
    const currentBoardId = getCurrentBoardId()
    saveWidgetState(currentBoardId, getCurrentViewId()) // Save current view state
    switchBoard(selectedBoardId)
    updateViewSelector(selectedBoardId)
  })

  document.getElementById('view-selector').addEventListener('change', async (event) => {
    const selectedBoardId = getCurrentBoardId()
    const target = /** @type {HTMLSelectElement} */(event.target)
    const selectedViewId = target.value
    logger.log(`Switching to selected view ${selectedViewId} in board ${selectedBoardId}`)
    await switchView(selectedBoardId, selectedViewId)
  })
}

/**
 * Populate the service drop-down with saved services.
 *
 * @function populateServiceDropdown
 * @returns {void}
 */
function populateServiceDropdown () {
  const selector = document.getElementById('service-selector')
  if (!selector) return
  selector.innerHTML = ''
  const newServiceBtn = document.createElement('button')
  newServiceBtn.textContent = 'New Service'
  newServiceBtn.addEventListener('click', () => {
    openSaveServiceModal('', () => {
      populateServiceDropdown()
      const all = servicesStore.load()
      const latest = all[all.length - 1]
      if (latest) addWidget(latest.url)
    })
  })
  selector.appendChild(newServiceBtn)
  servicesStore.load().forEach(service => {
    const btn = document.createElement('button')
    btn.textContent = service.name
    btn.addEventListener('click', () => {
      addWidget(service.url)
    })
    selector.appendChild(btn)
  })
}

/**
 * Apply visibility of the widget menu based on configuration.
 *
 * @function applyWidgetMenuVisibility
 * @returns {void}
 */
function applyWidgetMenuVisibility () {
  const widgetContainer = document.getElementById('widget-container')
  if (!widgetContainer) return
  const show = window.asd?.config?.globalSettings?.showMenuWidget
  if (show === false || show === 'false') {
    widgetContainer.classList.add('hide-widget-menu')
  } else {
    widgetContainer.classList.remove('hide-widget-menu')
  }
}

export { initializeDashboardMenu, applyWidgetMenuVisibility }
