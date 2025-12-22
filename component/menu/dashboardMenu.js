// dashboardMenu.js
// @ts-check

/**
 * Menu actions for adding widgets and switching boards/views.
 *
 * @module dashboardMenu
 */

// ServiceControl now mounted separately; widget selector helpers removed

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

let uiInitialized = false // Guard variable to avoid duplicate bindings

/**
 * Set up event handlers for the dashboard menu and populate widget selector.
 *
 * @function initializeDashboardMenu
 * @returns {void}
 */
function initializeDashboardMenu () {
  if (uiInitialized) return
  uiInitialized = true

  logger.log('Dashboard menu initialized')

  // Service panel is mounted in main.js; no extra wiring needed here

  applyWidgetMenuVisibility()

  const buttonDebounce = 200

  // Toggle widget menu visibility
  const handleToggleWidgetMenu = debounceLeading(() => {
    const widgetContainer = document.getElementById('widget-container')
    if (!widgetContainer) return

    const isHidden = widgetContainer.classList.toggle('hide-widget-menu')

    const message = isHidden
      ? `${emojiList.cross.unicode} Widget menu hidden`
      : `${emojiList.edit.unicode} Widget menu shown`

    // Safe read-modify-write: get latest from storage, modify, then save.
    const currentConfig = StorageManager.getConfig() || { globalSettings: {} }
    if (!currentConfig.globalSettings) currentConfig.globalSettings = {}
    currentConfig.globalSettings.showMenuWidget = !isHidden
    StorageManager.setConfig(currentConfig)

    showNotification(message, 500)
  }, buttonDebounce)

  const toggleBtn = document.getElementById('toggle-widget-menu')
  if (toggleBtn) {
    toggleBtn.addEventListener('click', /** @type {EventListener} */(handleToggleWidgetMenu))
  }

  // Reset environment
  const handleReset = debounceLeading(() => {
    // eslint-disable-next-line no-alert

    // Show confirmation dialog
    const confirmed = confirm('Reset dashboard (boards, views, services) but keep saved states?')

    if (confirmed) {
      StorageManager.clearAllExceptState()
      clearConfigFragment()
      location.reload()
    }
  }, buttonDebounce)

  const resetBtn = document.getElementById('reset-button')
  if (resetBtn) {
    resetBtn.addEventListener('click', /** @type {EventListener} */(handleReset))
  }

  // Board switcher
  const boardSelector = document.getElementById('board-selector')
  if (boardSelector) {
    boardSelector.addEventListener('change', async (event) => {
      const target = /** @type {HTMLSelectElement} */(event.target)
      const selectedBoardId = target.value
      const currentBoardId = getCurrentBoardId()

      // Persist current view state before switching
      saveWidgetState(currentBoardId, getCurrentViewId())

      try {
        await switchBoard(selectedBoardId)
      } catch (error) {
        logger.error('Error switching board:', error)
      }
      updateViewSelector(selectedBoardId)
    })
  }

  // View switcher
  const viewSelector = document.getElementById('view-selector')
  if (viewSelector) {
    viewSelector.addEventListener('change', async (event) => {
      const selectedBoardId = getCurrentBoardId()
      const target = /** @type {HTMLSelectElement} */(event.target)
      const selectedViewId = target.value

      logger.log(`Switching to selected view ${selectedViewId} in board ${selectedBoardId}`)
      await switchView(selectedBoardId, selectedViewId)
    })
  }
}

/**
 * Apply visibility of the widget menu based on persisted config.
 *
 * @function applyWidgetMenuVisibility
 * @returns {void}
 */
function applyWidgetMenuVisibility () {
  const widgetContainer = document.getElementById('widget-container')
  if (!widgetContainer) return
  const show = StorageManager.getConfig()?.globalSettings?.showMenuWidget
  if (show === false || show === 'false') {
    widgetContainer.classList.add('hide-widget-menu')
  } else {
    widgetContainer.classList.remove('hide-widget-menu')
  }
}

export { initializeDashboardMenu, applyWidgetMenuVisibility }
