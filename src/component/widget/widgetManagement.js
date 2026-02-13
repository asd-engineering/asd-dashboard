// @ts-check
/**
 * Widget creation and management functions.
 *
 * @module widgetManagement
 */
import { saveWidgetState } from '../../storage/widgetStatePersister.js'
import { fetchData } from './utils/fetchData.js'
import {
  showResizeMenu,
  hideResizeMenu,
  showResizeMenuBlock,
  hideResizeMenuBlock
} from './menu/resizeMenu.js'
import emojiList from '../../ui/unicodeEmoji.js'
import { debounce } from '../../utils/utils.js'
import { fetchServices } from './utils/fetchServices.js'
import { getServiceFromUrl } from './utils/widgetUtils.js'
import { getConfig } from '../../utils/getConfig.js'
import { handleDragStart, handleDragEnd } from './events/dragDrop.js'
import { toggleFullScreen } from './events/fullscreenToggle.js'
import { initializeResizeHandles } from './events/resizeHandler.js'
import { Logger } from '../../utils/Logger.js'
import { showServiceModal } from '../modal/serviceLaunchModal.js'
import { widgetGetUUID } from '../../utils/id.js'
import { StorageManager } from '../../storage/StorageManager.js'
import { getCurrentBoardId, getCurrentViewId } from '../../utils/elements.js'
import { showNotification } from '../dialog/notification.js'
import { resolveServiceConfig } from '../../utils/serviceUtils.js'

const logger = new Logger('widgetManagement.js')

/**
 * Creates the DOM structure for a new widget, including its iframe and menu.
 * @function createWidget
 * @param {string} service - The service identifier.
 * @param {string} url - The URL for the widget's iframe source.
 * @param {number} [gridColumnSpan=1] - The number of grid columns to span.
 * @param {number} [gridRowSpan=1] - The number of grid rows to span.
 * @param {string|null} [dataid=null] - An optional persistent identifier for the widget.
 * @returns {Promise<HTMLDivElement>} A promise that resolves to the widget's wrapper element.
 */
async function createWidget (
  service,
  url,
  gridColumnSpan = 1,
  gridRowSpan = 1,
  dataid = null
) {
  logger.log('Creating widget with URL:', url)
  const config = await getConfig()
  await fetchServices()
  const rawService = StorageManager.getServices().find((s) => s.name === service) || {}
  const serviceObj = resolveServiceConfig(rawService)

  const minColumns =
    serviceObj.config?.minColumns || config.styling.widget.minColumns
  const maxColumns =
    serviceObj.config?.maxColumns || config.styling.widget.maxColumns
  const minRows = serviceObj.config?.minRows || config.styling.widget.minRows
  const maxRows = serviceObj.config?.maxRows || config.styling.widget.maxRows

  const widgetWrapper = document.createElement('div')
  widgetWrapper.className = 'widget-wrapper widget'
  widgetWrapper.style.position = 'relative'
  widgetWrapper.dataset.service = service
  widgetWrapper.dataset.serviceId = serviceObj.id
  widgetWrapper.dataset.url = url
  widgetWrapper.dataset.dataid = dataid || widgetGetUUID()
  logger.log(`Creating widget for service: ${service}`)

  gridColumnSpan = Math.min(Math.max(gridColumnSpan, minColumns), maxColumns)
  gridRowSpan = Math.min(Math.max(gridRowSpan, minRows), maxRows)

  widgetWrapper.style.gridColumn = `span ${gridColumnSpan}`
  widgetWrapper.style.gridRow = `span ${gridRowSpan}`
  widgetWrapper.dataset.columns = String(gridColumnSpan)
  widgetWrapper.dataset.rows = String(gridRowSpan)

  const iframe = document.createElement('iframe')
  iframe.className = 'widget-iframe'
  iframe.src = url
  iframe.loading = 'lazy'
  iframe.style.border = '1px solid #ccc'
  iframe.style.width = '100%'
  iframe.style.height = '100%'

  const widgetMenu = document.createElement('div')
  widgetMenu.classList.add('widget-menu')

  const isOffline = String(serviceObj.state || '').toLowerCase() === 'offline'
  const hasFallback = Boolean(serviceObj && serviceObj.fallback && serviceObj.fallback.url)
  if (hasFallback && (isOffline || !url)) {
    const startOverlay = document.createElement('div')
    startOverlay.className = 'widget-start-overlay'
    const startTitle = document.createElement('h2')
    startTitle.className = 'widget-start-overlay-title'
    startTitle.textContent = 'Acties'

    const startButton = document.createElement('button')
    startButton.className = 'widget-start-overlay-button'
    startButton.textContent = 'Start'
    startButton.title = `Start ${serviceObj.name || service}`
    startButton.addEventListener('click', () => {
      showServiceModal(serviceObj, widgetWrapper)
    })

    startOverlay.append(startTitle, startButton)
    widgetWrapper.appendChild(startOverlay)
  }

  if (serviceObj && serviceObj.fallback) {
    const state = String(serviceObj.state || '').toLowerCase()
    const fixServiceButton = document.createElement('button')
    fixServiceButton.innerHTML = emojiList.launch.unicode
    fixServiceButton.classList.add('widget-button', 'widget-icon-action')
    fixServiceButton.title = state === 'offline' ? 'Start service' : 'Service action'
    fixServiceButton.dataset.testid = 'widget-service-action'
    fixServiceButton.onclick = () =>
      showServiceModal(serviceObj, widgetWrapper)
    widgetMenu.appendChild(fixServiceButton)
  }

  const removeButton = document.createElement('button')
  removeButton.innerHTML = emojiList.cross.unicode
  removeButton.classList.add('widget-button', 'widget-icon-remove')
  removeButton.addEventListener('click', () => removeWidget(widgetWrapper))

  const configureButton = document.createElement('button')
  configureButton.innerHTML = emojiList.link.unicode
  configureButton.classList.add('widget-button', 'widget-icon-link')
  configureButton.addEventListener('click', () => configureWidget(iframe))

  const refreshButton = document.createElement('button')
  refreshButton.innerHTML = emojiList.crossCycle.unicode
  refreshButton.classList.add('widget-button', 'widget-icon-refresh')
  refreshButton.title = 'Refresh widget'
  refreshButton.addEventListener('click', () => {
    try {
      const current = iframe.src; iframe.src = current
    } catch {
      // no-op
    }
  })

  const buttonDebounce = 200
  const debouncedHideResizeMenu = debounce(
    (icon) => hideResizeMenu(icon),
    buttonDebounce
  )
  const debouncedHideResizeMenuBlock = debounce(
    (wrapper) => hideResizeMenuBlock(wrapper),
    buttonDebounce
  )

  const resizeMenuIcon = document.createElement('button')
  resizeMenuIcon.innerHTML = emojiList.triangularRuler.unicode
  resizeMenuIcon.classList.add('widget-button', 'widget-icon-resize')
  resizeMenuIcon.addEventListener('mouseenter', () =>
    showResizeMenu(resizeMenuIcon)
  )
  resizeMenuIcon.addEventListener('mouseleave', (event) => {
    const related = /** @type {?HTMLElement} */ (event.relatedTarget)
    if (!related || !related.closest('.resize-menu')) {
      debouncedHideResizeMenu(resizeMenuIcon)
    }
  })

  const resizeMenuBlockIcon = document.createElement('button')
  resizeMenuBlockIcon.innerHTML = emojiList.puzzle.unicode
  resizeMenuBlockIcon.classList.add('widget-button', 'widget-icon-resize-block')
  resizeMenuBlockIcon.addEventListener('mouseenter', () =>
    showResizeMenuBlock(resizeMenuBlockIcon, widgetWrapper)
  )
  resizeMenuBlockIcon.addEventListener('mouseleave', (event) => {
    const related = /** @type {?HTMLElement} */ (event.relatedTarget)
    if (!related || !related.closest('.resize-menu-block')) {
      debouncedHideResizeMenuBlock(widgetWrapper)
    }
  })

  const dragHandle = document.createElement('span')
  dragHandle.classList.add('widget-button', 'widget-icon-drag')
  dragHandle.innerHTML = emojiList.pinching.icon
  dragHandle.draggable = true

  const fullScreenButton = document.createElement('button')
  fullScreenButton.innerHTML = emojiList.fullscreen.unicode
  fullScreenButton.classList.add('widget-button', 'widget-icon-fullscreen')
  fullScreenButton.addEventListener('click', (event) => {
    event.preventDefault()
    toggleFullScreen(widgetWrapper)
  })

  widgetMenu.append(
    fullScreenButton,
    refreshButton,
    removeButton,
    configureButton,
    resizeMenuIcon,
    resizeMenuBlockIcon,
    dragHandle
  )
  widgetWrapper.append(iframe, widgetMenu)

  dragHandle.addEventListener('dragstart', (e) => {
    widgetWrapper.classList.add('dragging')
    handleDragStart(e, widgetWrapper)
  })
  dragHandle.addEventListener('dragend', handleDragEnd)

  return widgetWrapper
}

/**
 * Adds a new widget to the current view and persists the state.
 * @function addWidget
 * @param {string} url - The URL of the service to embed.
 * @param {number} [columns] - The number of grid columns for the widget to span.
 * @param {number} [rows] - The number of grid rows for the widget to span.
 * @param {string} [type='iframe'] - The type of the widget.
 * @param {string} boardId - The ID of the board to add the widget to.
 * @param {string} viewId - The ID of the view to add the widget to.
 * @param {string|null} [dataid=null] - An optional persistent identifier for the widget.
 * @param {{skipCapacity?:boolean}} [opts] - Optional flags.
 * @returns {Promise<void>}
 */
async function addWidget (
  url,
  columns,
  rows,
  type = 'iframe',
  boardId = null,
  viewId = null,
  dataid = null,
  opts = {}
) {
  logger.log('Adding widget with URL:', url)
  const widgetContainer = document.getElementById('widget-container')
  if (!widgetContainer) return logger.error('Widget container not found')

  boardId = boardId || getCurrentBoardId()
  viewId = viewId || getCurrentViewId()

  await fetchServices() // Ensure services are loaded
  const serviceName = await getServiceFromUrl(url)
  if (window.asd.widgetStore.isAdding(serviceName)) return
  window.asd.widgetStore.lock(serviceName)
  try {
    const rawServiceObj = StorageManager.getServices().find((s) => s.name === serviceName) || {}
    const serviceObj = resolveServiceConfig(rawServiceObj)

    // Determine final dimensions with fallbacks to template defaults
    const finalColumns = columns ?? serviceObj.config?.columns ?? 1
    const finalRows = rows ?? serviceObj.config?.rows ?? 1

    // Enforce global maxInstances (across live DOM and persisted config)
    const liveDataIds = Array.from(window.asd.widgetStore.widgets.values())
      .filter(el => el.dataset.service === serviceName)
      .map(el => el.dataset.dataid)

    const config = StorageManager.getConfig() || {}
    const boards = Array.isArray(config.boards) ? config.boards : []
    const persistedDataIds = boards
      .flatMap(b => Array.isArray(b.views) ? b.views : [])
      .flatMap(v => Array.isArray(v.widgetState) ? v.widgetState : [])
      .map(w => w?.dataid)
      .filter(Boolean)

    const allIds = new Set([...liveDataIds, ...persistedDataIds])
    const effectiveCount = allIds.size

    const alreadyExists =
      !!dataid && (liveDataIds.includes(dataid) || persistedDataIds.includes(dataid))

    if (typeof serviceObj.maxInstances === 'number' && serviceObj.maxInstances > 0) {
      if (!alreadyExists && effectiveCount >= serviceObj.maxInstances) {
        if (typeof showNotification === 'function') {
          showNotification(
            `Cannot add more: limit (${serviceObj.maxInstances}) reached for "${serviceName}".`,
            3000,
            'error'
          )
        } else {
          // eslint-disable-next-line no-alert
          alert(`Cannot add more: limit (${serviceObj.maxInstances}) reached for "${serviceName}".`)
        }
        return
      }
    }

    const { skipCapacity = false } = opts
    if (!skipCapacity) {
      const proceed = await window.asd.widgetStore.confirmCapacity()
      if (!proceed) return
    }

    // Restore from cache if available
    if (dataid && window.asd.widgetStore.has(dataid)) {
      const widget = window.asd.widgetStore.get(dataid)
      widget.style.display = ''
      if (widget.parentElement !== widgetContainer) {
        widgetContainer.appendChild(widget)
      }
      saveWidgetState(boardId, viewId)
      return
    }

    // Otherwise, create and mount new widget
    const widgetWrapper = await createWidget(
      serviceName,
      url,
      finalColumns,
      finalRows,
      dataid
    )

    const visibleWidgetCount = Array.from(widgetContainer.children).filter(
      (el) => el instanceof HTMLElement && el.style.display !== 'none'
    ).length
    widgetWrapper.setAttribute('data-order', String(visibleWidgetCount))
    widgetWrapper.style.order = String(visibleWidgetCount)

    widgetContainer.appendChild(widgetWrapper)
    window.asd.widgetStore.add(widgetWrapper)

    if (serviceObj && serviceObj.type === 'api') {
      fetchData(url, (data) => {
        const iframe = widgetWrapper.querySelector('iframe')
        iframe?.contentWindow?.postMessage(data, '*')
      })
    }

    saveWidgetState(boardId, viewId)
    initializeResizeHandles()
  } finally {
    window.asd.widgetStore.unlock(serviceName)
  }
}

/**
 * Removes a widget from the view and updates the layout.
 * @function removeWidget
 * @param {HTMLElement} widgetElement - The widget wrapper element to remove.
 * @returns {Promise<void>}
*/
async function removeWidget (widgetElement) {
  const dataid = widgetElement.dataset.dataid
  await window.asd.widgetStore.requestRemoval(dataid)
  updateWidgetOrders()
}

/**
 * Prompts the user to enter a new URL for a widget's iframe.
 * @function configureWidget
 * @param {HTMLIFrameElement} iframeElement - The iframe element of the widget to configure.
 * @returns {Promise<void>}
 */
async function configureWidget (iframeElement) {
  const newUrl = prompt('Enter new URL for the widget:', iframeElement.src)
  if (newUrl) {
    iframeElement.src = newUrl
    saveWidgetState()
  }
}

/**
 * Recompute and store the ordering of widgets in the container based on their DOM position.
 * Saves the updated arrangement via saveWidgetState.
 * @returns {void}
 */
function updateWidgetOrders () {
  const widgetContainer = document.getElementById('widget-container')
  const widgetsInDomOrder = Array.from(widgetContainer.children)

  let visibleIndex = 0
  widgetsInDomOrder.forEach((widget) => {
    const el = /** @type {HTMLElement} */ (widget)
    if (el.style.display !== 'none') {
      const newOrder = String(visibleIndex)
      el.setAttribute('data-order', newOrder)
      el.style.order = newOrder
      visibleIndex++
    }
  })

  // Main branch semantics: save using current board/view inferred by persister
  saveWidgetState()
}

/**
 * Locate the board and view containing a widget id in persisted config.
 * @param {string} id
 * @returns {{boardId:string, viewId:string}|null}
 */
function findWidgetLocation (id) {
  const boards = StorageManager.getBoards()
  for (const board of boards) {
    for (const view of board.views || []) {
      if ((view.widgetState || []).some(w => w.dataid === id)) {
        return { boardId: board.id, viewId: view.id }
      }
    }
  }
  return null
}

/**
 * Find the board and view containing the first instance of a widget by its serviceId.
 * This function scans the persisted configuration, not the live widgetStore.
 * @param {string} serviceId - The unique ID of the service to find.
 * @returns {{boardId: string, viewId: string} | null} The location or null if not found.
 */
function findServiceLocation (serviceId) {
  const boards = StorageManager.getBoards()
  if (!boards || !serviceId) return null

  for (const board of boards) {
    for (const view of board.views || []) {
      const exists = (view.widgetState || []).some(
        w => w.serviceId === serviceId
      )
      if (exists) return { boardId: board.id, viewId: view.id }
    }
  }
  return null
}

export {
  addWidget,
  removeWidget,
  updateWidgetOrders,
  createWidget,
  findWidgetLocation,
  findServiceLocation
}
