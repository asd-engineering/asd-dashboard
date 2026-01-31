// src/main.js
// @ts-check
/**
 * Entry point for the dashboard application.
 *
 * @module main
 */
import { initializeMainMenu, applyControlVisibility } from './component/menu/menu.js'
import { initializeBoards, switchBoard, updateBoardSelector, updateViewSelector } from './component/board/boardManagement.js'
import { getCurrentBoardId } from './utils/elements.js'
import { initializeDashboardMenu, applyWidgetMenuVisibility } from './component/menu/dashboardMenu.js'
import { initializeDragAndDrop } from './component/widget/events/dragDrop.js'
import { fetchServices } from './utils/fetchServices.js'
import { getConfig } from './utils/getConfig.js'
import { openConfigModal } from './component/modal/configModal.js'
import { mountBoardControl } from './component/board/BoardControl.js'
import { mountViewControl } from './component/view/ViewControl.js'
import { loadFromFragment } from './utils/fragmentLoader.js'
import { Logger } from './utils/Logger.js'
import { widgetStore } from './component/widget/widgetStore.js'
import { debounce, debounceLeading } from './utils/utils.js'
import { StorageManager, APP_STATE_CHANGED } from './storage/StorageManager.js'
import { runSilentImportFlowIfRequested } from './flows/silentImportFlow.js'
import { initThemeFromConfig } from './ui/theme.js'

import { mountServiceControl } from './component/service/ServiceControl.js'

const logger = new Logger('main.js')
Logger.enableLogs('all')

const LAYER_ROOT_ID = 'asd-layer-root'
/** Ensure the overlay layer root exists */
function ensureLayerRoot () {
  if (!document.getElementById(LAYER_ROOT_ID)) {
    const el = document.createElement('div')
    el.id = LAYER_ROOT_ID
    document.body.appendChild(el)
  }
}

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

  ensureLayerRoot()

  try {
    await StorageManager.init({ persist: true })
  } catch (err) {
    console.error('Failed to initialize StorageManager', err)
    throw err
  }

  // 1. Handle configuration from URL fragment first
  const params = new URLSearchParams(location.search)
  const force = params.get('force') === 'true'

  // Run silent-import first so fragment loading only happens once
  const didImport = await runSilentImportFlowIfRequested()
  if (!didImport) await loadFromFragment(force)

  // 2. Initialize core UI elements
  initializeMainMenu()
  initializeDashboardMenu()
  const boardPanel = mountBoardControl()
  const viewPanel = mountViewControl()
  const servicePanel = mountServiceControl()
  initializeDragAndDrop()

  // 3. Load services and configuration in parallel
  /** @type {import('./types.js').DashboardConfig} */
  let config
  try {
    await Promise.all([fetchServices(), getConfig()]).then(([, result]) => {
      config = result
    })
  } catch (e) {
    logger.error('Failed to load critical configuration or services:', e)
    // If config fails, getConfig() will open the modal.
    return // Stop initialization if critical data fails
  }

  // 4. Apply settings that depend on the loaded config
  initThemeFromConfig(config)
  applyControlVisibility()
  applyWidgetMenuVisibility()

  // 5. Initialize boards and switch to the last used or default board/view
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
    if (boardPanel) boardPanel.refresh()
    if (viewPanel) viewPanel.refresh()
  } else {
    logger.warn('No boards available to display.')
  }

  // Initial service panel population (after services & boards)
  servicePanel?.refresh()

  // 7. Initialize modal triggers
  const buttonDebounce = 200
  const handleConfigModal = debounceLeading(openConfigModal, buttonDebounce)
  document.getElementById('open-config-modal')
    .addEventListener('click', /** @type {EventListener} */(handleConfigModal))

  // ACTIVE EVENT LISTENER ---
  const onStateChange = (event) => {
    const { reason } = event.detail || {}
    logger.log(`[Event Listener] Reacting to state change. Reason: ${reason || 'unknown'}`)

    const currentBoardId = getCurrentBoardId()

    switch (reason) {
      case 'config':
        updateBoardSelector()
        if (currentBoardId) updateViewSelector(currentBoardId)
        if (boardPanel) boardPanel.refresh()
        if (viewPanel) viewPanel.refresh()
        // Repopulate panel when config (e.g., boards/views) changes
        servicePanel?.refresh()
        break

      case 'services':
        // Repopulate panel when services update
        servicePanel?.refresh()
        break
    }
  }

  const debouncedUiUpdater = debounce(onStateChange, 150)
  window.addEventListener(APP_STATE_CHANGED, /** @type {EventListener} */(debouncedUiUpdater))
  logger.log('Active event listener for state changes has been initialized.')

  logger.log('Application initialization finished')
  // Signal to Playwright that the initial load and render is complete.
  document.dispatchEvent(new Event('main:ready'))
  document.body.dataset.ready = 'true'
}

// Start the application once the DOM is ready; ensure the event isn't missed
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main)
} else {
  main().catch(err => logger.error('Failed to initialize application', err))
}
