// @ts-check
/**
 * Entry point for the dashboard application.
 *
 * @module main
 */
import { initializeMainMenu, applyControlVisibility } from './component/menu/menu.js'
import { initializeBoards, switchBoard } from './component/board/boardManagement.js'
import { initializeDashboardMenu, applyWidgetMenuVisibility } from './component/menu/dashboardMenu.js'
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
import { debounceLeading } from './utils/utils.js'
import StorageManager from './storage/StorageManager.js'

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
  try {
    await Promise.all([
      fetchServices(),
      getConfig()
    ])
  } catch (e) {
    logger.error('Failed to load critical configuration or services:', e)
    // If config fails, getConfig() will open the modal.
    return // Stop initialization if critical data fails
  }

  // 4. Apply settings that depend on the loaded config
  applyControlVisibility()
  applyWidgetMenuVisibility()

  // 5. Load boards from storage.
  let boards = StorageManager.getBoards()
  // If no boards exist and config specifies to load from itself, do so.
  if (boards.length === 0 && window.asd.config.globalSettings?.localStorage?.loadDashboardFromConfig === 'true') {
    const cfgBoards = (StorageManager.getConfig() || {}).boards || []
    if (Array.isArray(cfgBoards) && cfgBoards.length > 0) {
      StorageManager.setBoards(cfgBoards)
      boards = cfgBoards
    }
  }

  // 6. Initialize boards and switch to the last used or default board/view
  const initialBoardView = await initializeBoards() // initializeBoards is now fully async

  const lastUsedBoardId = StorageManager.misc.getLastBoardId()
  const lastUsedViewId = StorageManager.misc.getLastViewId()

  const boardExists = StorageManager.getBoards().some(board => board.id === lastUsedBoardId)

  let boardIdToLoad = initialBoardView?.boardId
  let viewIdToLoad = initialBoardView?.viewId

  if (boardExists) {
    boardIdToLoad = lastUsedBoardId
    viewIdToLoad = lastUsedViewId
  }

  if (boardIdToLoad) {
    logger.log(`Switching to initial board: ${boardIdToLoad}, view: ${viewIdToLoad}`)
    await switchBoard(boardIdToLoad, viewIdToLoad)
  } else {
    logger.warn('No boards available to display.')
  }

  // 7. Initialize modal triggers
  const buttonDebounce = 200
  const handleLocalStorageModal = debounceLeading(openLocalStorageModal, buttonDebounce)
  const handleConfigModal = debounceLeading(openConfigModal, buttonDebounce)
  document.getElementById('localStorage-edit-button').addEventListener('click', /** @type {EventListener} */(handleLocalStorageModal))
  document.getElementById('open-config-modal').addEventListener('click', /** @type {EventListener} */(handleConfigModal))

  logger.log('Application initialization finished')
  // Signal to Playwright that the initial load and render is complete.
  document.body.setAttribute('data-ready', 'true')
}

// Start the application when the DOM is ready
document.addEventListener('DOMContentLoaded', main)
