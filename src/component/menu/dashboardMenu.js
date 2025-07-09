// @ts-check
/**
 * Menu actions for adding widgets and switching boards/views.
 *
 * @module dashboardMenu
 */
import { addWidget } from '../widget/widgetManagement.js'
import { openSaveServiceModal } from '../modal/saveServiceModal.js'
import {
  switchBoard,
  switchView,
  updateViewSelector
} from '../../component/board/boardManagement.js'
import { saveWidgetState } from '../../storage/widgetStatePersister.js'
import { getCurrentBoardId, getCurrentViewId } from '../../utils/elements.js'
import { showNotification } from '../dialog/notification.js'
import emojiList from '../../ui/unicodeEmoji.js'
import { Logger } from '../../utils/Logger.js'
import { clearConfigFragment } from '../../utils/fragmentGuard.js'
import StorageManager from '../../storage/StorageManager.js'
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

  document.getElementById('add-widget-button').addEventListener('click', async () => {
    const serviceSelector = /** @type {HTMLSelectElement} */(document.getElementById('service-selector'))
    const widgetUrlInput = /** @type {HTMLInputElement} */(document.getElementById('widget-url'))
    const boardElement = document.querySelector('.board')
    const viewElement = document.querySelector('.board-view')
    const selectedServiceUrl = serviceSelector.value
    const manualUrl = widgetUrlInput.value
    const url = selectedServiceUrl || manualUrl

    const finalize = async () => {
      try {
        await addWidget(url, 1, 1, 'iframe', boardElement.id, viewElement.id)
      } catch (error) {
        logger.error('Error adding widget:', error)
      }
      widgetUrlInput.value = ''
    }

    if (selectedServiceUrl) {
      await finalize()
    } else if (manualUrl) {
      openSaveServiceModal(manualUrl, finalize)
    } else {
      showNotification('Please select a service or enter a URL.')
    }
  })

  const handleToggleWidgetMenu = debounceLeading(() => {
    const widgetContainer = document.getElementById('widget-container')
    const toggled = widgetContainer.classList.toggle('hide-widget-menu')

    const message = toggled
      ? `${emojiList.cross.unicode} Widget menu hidden`
      : `${emojiList.edit.unicode} Widget menu shown`

    // --- FIX STARTS HERE ---
    if (window.asd && window.asd.config && window.asd.config.globalSettings) {
      // 1. Update the in-memory config
      window.asd.config.globalSettings.showMenuWidget = !toggled

      // 2. Load the current config from storage to ensure it's fresh
      const currentConfig = StorageManager.getConfig() || {}

      // 3. Merge the change into the fresh config
      const updatedConfig = {
        ...currentConfig,
        globalSettings: {
          ...currentConfig.globalSettings,
          showMenuWidget: !toggled
        }
      }

      // 4. Save only the updated config, but let's do better (see Rec 2)
      // This still has the side-effect problem, but at least the data is less stale.
      // The BEST fix is to change StorageManager.
      StorageManager.setConfig(updatedConfig)
    }
    // --- FIX ENDS HERE ---

    showNotification(message, 500)
  }, buttonDebounce)

  document.getElementById('toggle-widget-menu').addEventListener('click', /** @type {EventListener} */(handleToggleWidgetMenu))

  const handleReset = debounceLeading(() => {
    // Show confirmation dialog
    const confirmed = confirm('Confirm environment reset: all configurations and services will be permanently deleted.')

    if (confirmed) {
      StorageManager.clearAll()
      clearConfigFragment()
      location.reload()
    }
  }, buttonDebounce)
  document.getElementById('reset-button').addEventListener('click', /** @type {EventListener} */(handleReset))

  document.getElementById('board-selector').addEventListener('change', async (event) => {
    const target = /** @type {HTMLSelectElement} */(event.target)
    const selectedBoardId = target.value
    const currentBoardId = getCurrentBoardId()
    saveWidgetState(currentBoardId, getCurrentViewId()) // Save current view state
    try {
      await switchBoard(selectedBoardId)
    } catch (error) {
      logger.error('Error switching board:', error)
    }
    updateViewSelector(selectedBoardId)
  })

  document.getElementById('view-selector').addEventListener('change', async (event) => {
    const selectedBoardId = getCurrentBoardId()
    const currentViewId = getCurrentViewId() // Get the current view ID *before* switching
    const target = /** @type {HTMLSelectElement} */(event.target)
    const selectedViewId = target.value

    saveWidgetState(selectedBoardId, currentViewId)

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
  const defaultOption = document.createElement('option')
  defaultOption.value = ''
  defaultOption.textContent = 'Select a Service'
  selector.appendChild(defaultOption)
  StorageManager.getServices().forEach(service => {
    const opt = document.createElement('option')
    opt.value = service.url
    opt.textContent = service.name
    selector.appendChild(opt)
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
