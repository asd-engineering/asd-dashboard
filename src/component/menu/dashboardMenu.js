import { addWidget } from '../widget/widgetManagement.js'
import {
  switchBoard,
  switchView,
  updateViewSelector
} from '../../component/board/boardManagement.js'
import { saveWidgetState } from '../../storage/localStorage.js'
import { getCurrentBoardId } from '../../utils/elements.js'
import { showNotification } from '../dialog/notification.js'
import { Logger } from '../../utils/Logger.js'

const logger = new Logger('dashboardMenu.js')

let uiInitialized = false // Guard variable

function initializeDashboardMenu () {
  if (uiInitialized) return // Guard clause
  uiInitialized = true

  logger.log('Dashboard menu initialized')

  document.getElementById('add-widget-button').addEventListener('click', () => {
    const serviceSelector = document.getElementById('service-selector')
    const widgetUrlInput = document.getElementById('widget-url')
    const boardElement = document.querySelector('.board')
    const viewElement = document.querySelector('.board-view')
    const url = serviceSelector.value || widgetUrlInput.value

    if (url) {
      addWidget(url, 1, 1, 'iframe', boardElement.id, viewElement.id)
    } else {
      showNotification('Please select a service or enter a URL.')
    }
  })

  document.getElementById('toggle-widget-menu').addEventListener('click', () => {
    const widgetContainer = document.getElementById('widget-container')
    widgetContainer.classList.toggle('hide-widget-menu')
  })

  document.getElementById('reset-button').addEventListener('click', () => {
    localStorage.clear()
    location.reload()
  })

  document.getElementById('board-selector').addEventListener('change', (event) => {
    const selectedBoardId = event.target.value
    const currentBoardId = getCurrentBoardId()
    saveWidgetState(currentBoardId) // Save the state of the current board before switching
    switchBoard(selectedBoardId)
    updateViewSelector(selectedBoardId)
  })

  document.getElementById('view-selector').addEventListener('change', (event) => {
    const selectedBoardId = getCurrentBoardId()
    const selectedViewId = event.target.value
    logger.log(`Switching to selected view ${selectedViewId} in board ${selectedBoardId}`)
    switchView(selectedBoardId, selectedViewId)
  })
}

export { initializeDashboardMenu }
