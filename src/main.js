// @ts-check
/**
 * Entry point for the dashboard application.
 *
 * @module main
 */
import { initializeMainMenu, applyControlVisibility } from './component/menu/menu.js'
import { initializeBoards, switchBoard, updateBoardSelector, updateViewSelector } from './component/board/boardManagement.js'
import { getCurrentBoardId } from './utils/elements.js'
import { initializeDashboardMenu, applyWidgetMenuVisibility, populateServiceDropdown } from './component/menu/dashboardMenu.js'
import { initializeDragAndDrop } from './component/widget/events/dragDrop.js'
import { fetchServices } from './utils/fetchServices.js'
import { getConfig } from './utils/getConfig.js'
import { openLocalStorageModal } from './component/modal/localStorageModal.js'
import { openConfigModal } from './component/modal/configModal.js'
import { initializeBoardDropdown } from './component/board/boardDropdown.js'
import { initializeViewDropdown } from './component/view/viewDropdown.js'
import { loadFromFragment } from './utils/fragmentLoader.js'
import { Logger } from './utils/Logger.js'
import { widgetStore } from './component/widget/widgetStore.js'
import { debounce, debounceLeading } from './utils/utils.js'
import StorageManager, { APP_STATE_CHANGED } from './storage/StorageManager.js'

const logger = new Logger('main.js')

Logger.enableLogs('all')

// Global state container
window.asd = {
  services: [],
  config: {},
  currentBoardId: null,
  currentViewId: null,
  widgetStore
}

window.addEventListener('hashchange', () => loadFromFragment(false))

/**
 * Main application initialization function.
 * Orchestrates loading configuration, services, and initializing the UI.
 */
async function main () {
  logger.log('Application initialization started')

  // 1. Handle configuration from URL fragment first
  const params = new URLSearchParams(location.search)
  const force = params.get('force') === 'true'
  await loadFromFragment(force)

  // 2. Initialize core UI elements
  initializeMainMenu()
  initializeDashboardMenu()
  initializeBoardDropdown()
  initializeViewDropdown()
  initializeDragAndDrop()

  // 3. Load services and configuration in parallel
  /** @type {import('./types.js').DashboardConfig} */
  let config
  try {
    await Promise.all([
      fetchServices(),
      getConfig()
    ]).then(([, result]) => {
      config = result
    })
  } catch (e) {
    logger.error('Failed to load critical configuration or services:', e)
    // If config fails, getConfig() will open the modal.
    return // Stop initialization if critical data fails
  }

  // 4. Apply settings that depend on the loaded config
  applyControlVisibility()
  applyWidgetMenuVisibility()

  // 5. Migrate legacy boards key and load from config (remove before merging to main)
  const oldBoards = JSON.parse(localStorage.getItem('boards') || '[]')
  if (oldBoards.length > 0 && (!config.boards || config.boards.length === 0)) {
    logger.log('Migrating old boards key into config')
    StorageManager.updateConfig(cfg => { cfg.boards = oldBoards })
    localStorage.removeItem('boards')
    config.boards = oldBoards
  }

  // 6. Initialize boards and switch to the last used or default board/view
  const initialBoardView = await initializeBoards()

  const lastUsedBoardId = StorageManager.misc.getLastBoardId()
  const lastUsedViewId = StorageManager.misc.getLastViewId()

  const boardExists = (config.boards || []).some(board => board.id === lastUsedBoardId)

  let boardIdToLoad = initialBoardView?.boardId
  let viewIdToLoad = initialBoardView?.viewId

  if (boardExists) {
    boardIdToLoad = lastUsedBoardId
    viewIdToLoad = lastUsedViewId
  }

  if (boardIdToLoad) {
    logger.log(`Switching to initial board: ${boardIdToLoad}, view: ${viewIdToLoad}`)
    await switchBoard(boardIdToLoad, viewIdToLoad)
    updateViewSelector(boardIdToLoad)
  } else {
    logger.warn('No boards available to display.')
  }

  // 7. Initialize modal triggers
  const buttonDebounce = 200
  const handleLocalStorageModal = debounceLeading(openLocalStorageModal, buttonDebounce)
  const handleConfigModal = debounceLeading(openConfigModal, buttonDebounce)
  document.getElementById('localStorage-edit-button').addEventListener('click', /** @type {EventListener} */(handleLocalStorageModal))
  document.getElementById('open-config-modal').addEventListener('click', /** @type {EventListener} */(handleConfigModal))

  // --- PHASE 2: ACTIVE EVENT LISTENER ---
  const onStateChange = (event) => {
    const { reason } = event.detail || {}
    logger.log(`[Event Listener] Reacting to state change. Reason: ${reason || 'unknown'}`)

    const currentBoardId = getCurrentBoardId()

    switch (reason) {
      case 'config':
        updateBoardSelector()
        if (currentBoardId) {
          updateViewSelector(currentBoardId)
        }
        populateServiceDropdown()
        break

      case 'services':
        populateServiceDropdown()
        break
    }
  }

  const debouncedUiUpdater = debounce(onStateChange, 150)
  window.addEventListener(APP_STATE_CHANGED, /** @type {EventListener} */(debouncedUiUpdater))
  logger.log('Active event listener for state changes has been initialized.')
  // --- END ---

  logger.log('Application initialization finished')
  // Signal to Playwright that the initial load and render is complete.
  document.dispatchEvent(new Event('main:ready'))
  document.body.dataset.ready = 'true'
}

// Start the application when the DOM is ready
document.addEventListener('DOMContentLoaded', main)
