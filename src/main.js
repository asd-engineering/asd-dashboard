// @ts-check
/**
 * Entry point for the dashboard application.
 *
 * @module main
 */
import { initializeMainMenu, applyControlVisibility } from './component/menu/menu.js'
import { initializeBoards, switchBoard } from './component/board/boardManagement.js'
import { initializeDashboardMenu } from './component/menu/dashboardMenu.js'
import { loadInitialConfig, loadBoardState } from './storage/localStorage.js'
import { initializeDragAndDrop } from './component/widget/events/dragDrop.js'
import { fetchServices } from './utils/fetchServices.js'
import { getConfig } from './utils/getConfig.js'
import { openLocalStorageModal } from './component/modal/localStorageModal.js'
import { openConfigModal } from './component/modal/configModal.js'
import { initializeBoardDropdown } from './component/board/boardDropdown.js'
import { initializeViewDropdown } from './component/view/viewDropdown.js'
import { loadFromFragment } from './utils/fragmentLoader.js'
import { Logger } from './utils/Logger.js'

const logger = new Logger('main.js')

// localStorage.setItem('log', 'all')

window.asd = {
  services: [],
  config: {},
  boards: [],
  currentBoardId: null,
  currentViewId: null
}

document.addEventListener('DOMContentLoaded', async () => {
  logger.log('DOMContentLoaded event fired')
  const params = new URLSearchParams(location.search)
  const force = params.get('force') === 'true'
  await loadFromFragment(force)
  initializeMainMenu()
  fetchServices()
  try {
    await getConfig()
  } catch (e) {
    logger.error('Failed to load config:', e)
    openConfigModal()
  }
  applyControlVisibility()
  initializeDashboardMenu()

  const boards = await loadBoardState()
  logger.log(`Loaded boards from localStorage: ${JSON.stringify(boards)}`)

  if (boards.length === 0 && window.asd.config.globalSettings.localStorage.loadDashboardFromConfig === 'true') {
    await loadInitialConfig()
  }

  const lastUsedBoardId = localStorage.getItem('lastUsedBoardId')
  const lastUsedViewId = localStorage.getItem('lastUsedViewId')

  // Check if the last used board ID exists in the loaded boards
  const boardExists = boards.some(board => board.id === lastUsedBoardId)
  if (!boardExists) {
    logger.warn(`Board with ID ${lastUsedBoardId} does not exist. Setting currentBoardId and currentViewId to null.`)
    window.asd.currentBoardId = null
    window.asd.currentViewId = null
  } else {
    window.asd.currentBoardId = lastUsedBoardId
    window.asd.currentViewId = lastUsedViewId
  }

  initializeBoards().then(async initialBoardView => {
    const boardIdToLoad = window.asd.currentBoardId || initialBoardView.boardId
    const viewIdToLoad = window.asd.currentViewId || initialBoardView.viewId
    logger.log(`Set currentBoardId to: ${window.asd.currentBoardId}, currentViewId to: ${window.asd.currentViewId}`)
    logger.log(`Switching to boardId: ${boardIdToLoad}, viewId: ${viewIdToLoad}`)
    await switchBoard(boardIdToLoad, viewIdToLoad)
  }).catch(error => {
    logger.error('Failed to initialize boards:', error)
  })

  initializeDragAndDrop()

  // Initialize dropdowns
  initializeBoardDropdown()
  initializeViewDropdown()

  // Add event listener for the localStorage edit button
  document.getElementById('localStorage-edit-button').addEventListener('click', () => {
    try {
      openLocalStorageModal()
    } catch (error) {
      logger.error('Error opening LocalStorage modal:', error)
    }
  })

  const configButton = document.getElementById('open-config-modal')
  if (configButton) {
    configButton.addEventListener('click', () => {
      try {
        openConfigModal()
      } catch (error) {
        logger.error('Error opening config modal:', error)
      }
    })
  }
})
