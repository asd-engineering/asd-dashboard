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
import { Logger } from '../../utils/Logger.js'
import { clearConfigFragment } from '../../utils/fragmentGuard.js'

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

  document.getElementById('add-widget-button').addEventListener('click', async () => {
    const serviceSelector = /** @type {HTMLSelectElement} */(document.getElementById('service-selector'))
    const widgetUrlInput = /** @type {HTMLInputElement} */(document.getElementById('widget-url'))
    const boardElement = document.querySelector('.board')
    const viewElement = document.querySelector('.board-view')
    const selectedServiceUrl = serviceSelector.value
    const manualUrl = widgetUrlInput.value
    const url = selectedServiceUrl || manualUrl

    const finalize = async () => {
      await addWidget(url, 1, 1, 'iframe', boardElement.id, viewElement.id)
      widgetUrlInput.value = ''
    }

    if (selectedServiceUrl) {
      finalize()
    } else if (manualUrl) {
      openSaveServiceModal(manualUrl, finalize)
    } else {
      showNotification('Please select a service or enter a URL.')
    }
  })

  document.getElementById('toggle-widget-menu').addEventListener('click', () => {
    const widgetContainer = document.getElementById('widget-container')
    widgetContainer.classList.toggle('hide-widget-menu')
  })

  document.getElementById('reset-button').addEventListener('click', () => {
    // Show confirmation dialog
    const confirmed = confirm('Confirm environment reset: all configurations and services will be permanently deleted.')

    if (confirmed) {
      localStorage.clear()
      clearConfigFragment()
      location.reload()
    }
  })

  document.getElementById('board-selector').addEventListener('change', async (event) => {
    const target = /** @type {HTMLSelectElement} */(event.target)
    const selectedBoardId = target.value
    const currentBoardId = getCurrentBoardId()
    saveWidgetState(currentBoardId, getCurrentViewId()) // Save current view state
    await switchBoard(selectedBoardId)
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
  const defaultOption = document.createElement('option')
  defaultOption.value = ''
  defaultOption.textContent = 'Select a Service'
  selector.appendChild(defaultOption)
  servicesStore.load().forEach(service => {
    const opt = document.createElement('option')
    opt.value = service.url
    opt.textContent = service.name
    selector.appendChild(opt)
  })
}

export { initializeDashboardMenu }
