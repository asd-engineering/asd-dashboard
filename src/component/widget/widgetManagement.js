// @ts-check
/**
 * Widget creation and management functions.
 *
 * @module widgetManagement
 */
import { saveWidgetState } from '../../storage/localStorage.js'
import { fetchData } from './utils/fetchData.js'
import { showResizeMenu, hideResizeMenu, showResizeMenuBlock, hideResizeMenuBlock } from './menu/resizeMenu.js'
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
import { WidgetLRUCache, isCacheDisabled } from './widgetCache.js'
import { deferredMount } from './utils/deferredMount.js'

const logger = new Logger('widgetManagement.js')

let cacheInstance = null
const pendingMounts = []

function getCache () {
  if (!cacheInstance) {
    const limit = Number(window.asd?.config?.globalSettings?.widget_cache_count) || 10
    cacheInstance = new WidgetLRUCache(limit)
    const dev = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) ||
      (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') ||
      window.location.hostname === 'localhost'
    if (dev) {
      window.widgetCacheDebug = {
        getStats: () => cacheInstance.stats(),
        clear: () => cacheInstance.clear(),
        getKeys: () => cacheInstance.stats().keys
      }
    }
  }
  return cacheInstance
}

function clearPendingMounts () {
  while (pendingMounts.length) {
    const cancel = pendingMounts.pop()
    cancel()
  }
}

/**
 * Build the DOM structure for a widget iframe and its controls.
 *
 * @param {string} service - Service identifier derived from the URL.
 * @param {string} url - Iframe source URL.
 * @param {number} [gridColumnSpan=1] - Number of grid columns to span.
 * @param {number} [gridRowSpan=1] - Number of grid rows to span.
 * @param {?string} [dataid=null] - Optional persistent widget identifier.
 * @param {string|number} [version='1'] - Widget version for cache validation.
 * @function createWidget
 * @returns {Promise<HTMLDivElement>} Wrapper element containing the widget.
 */
async function createWidget (service, url, gridColumnSpan = 1, gridRowSpan = 1, dataid = null, version = '1') {
  logger.log('Creating widget with URL:', url)
  const config = await getConfig()
  const services = await fetchServices()
  const serviceObj = services.find(s => s.name === service) || {}

  // Note: min,max ows and columns are not mandatory
  const minColumns = serviceObj.config?.minColumns || config.styling.widget.minColumns
  const maxColumns = serviceObj.config?.maxColumns || config.styling.widget.maxColumns

  const minRows = serviceObj.config?.minRows || config.styling.widget.minRows
  const maxRows = serviceObj.config?.maxRows || config.styling.widget.maxRows

  const widgetWrapper = document.createElement('div')
  widgetWrapper.className = 'widget-wrapper widget'
  widgetWrapper.style.position = 'relative'
  widgetWrapper.dataset.service = service
  widgetWrapper.dataset.url = url
  widgetWrapper.dataset.dataid = dataid || crypto.randomUUID() // Use existing dataid or generate a new one
  widgetWrapper.dataset.version = String(version)
  logger.log(`Creating widget for service: ${service}`)

  gridColumnSpan = Math.min(Math.max(gridColumnSpan, minColumns), maxColumns)
  gridRowSpan = Math.min(Math.max(gridRowSpan, minRows), maxRows)

  widgetWrapper.style.gridColumn = `span ${gridColumnSpan}`
  widgetWrapper.style.gridRow = `span ${gridRowSpan}`
  widgetWrapper.dataset.columns = String(gridColumnSpan)
  widgetWrapper.dataset.rows = String(gridRowSpan)

  const iframe = document.createElement('iframe')
  iframe.src = url
  iframe.loading = 'lazy'
  iframe.style.border = '1px solid #ccc'
  iframe.style.width = '100%'
  iframe.style.height = '100%'

  const widgetMenu = document.createElement('div')
  widgetMenu.classList.add('widget-menu')

  // iframe.onerror = () Will not ever work!
  console.log(serviceObj.fallback)
  if (serviceObj && serviceObj.fallback) {
    logger.log('Fallback action found for service:', service)
    const fixServiceButton = document.createElement('button')
    fixServiceButton.innerHTML = emojiList.launch.unicode
    fixServiceButton.classList.add('widget-button', 'widget-icon-action')
    fixServiceButton.onclick = () => {
      showServiceModal(serviceObj, widgetWrapper)
    }
    widgetMenu.appendChild(fixServiceButton)
    logger.log('Fix Service button added to widget for service:', service)
  } else {
    logger.info('No fallback action found for service:', service)
  }

  const removeButton = document.createElement('button')
  removeButton.innerHTML = emojiList.cross.unicode
  removeButton.classList.add('widget-button', 'widget-icon-remove')
  removeButton.addEventListener('click', () => {
    removeWidget(widgetWrapper)
  })

  const configureButton = document.createElement('button')
  configureButton.innerHTML = emojiList.link.unicode
  configureButton.classList.add('widget-button', 'widget-icon-link')
  configureButton.addEventListener('click', () => {
    configureWidget(iframe)
  })

  const buttonDebounce = 200

  const debouncedHideResizeMenu = debounce((icon) => {
    hideResizeMenu(icon)
  }, buttonDebounce)

  const debouncedHideResizeMenuBlock = debounce((widgetWrapper) => {
    hideResizeMenuBlock(widgetWrapper)
  }, buttonDebounce)

  const resizeMenuIcon = document.createElement('button')
  resizeMenuIcon.innerHTML = emojiList.triangularRuler.unicode
  resizeMenuIcon.classList.add('widget-button', 'widget-icon-resize')
  resizeMenuIcon.addEventListener('mouseenter', () => {
    logger.log('Mouse enter resize menu icon')
    showResizeMenu(resizeMenuIcon)
  })

  resizeMenuIcon.addEventListener('mouseleave', (event) => {
    logger.log('Mouse left resize menu icon')
    const related = /** @type {?HTMLElement} */(event.relatedTarget)
    if (!related || !related.closest('.resize-menu')) {
      debouncedHideResizeMenu(resizeMenuIcon)
    }
  })

  const resizeMenuBlockIcon = document.createElement('button')
  resizeMenuBlockIcon.innerHTML = emojiList.puzzle.unicode
  resizeMenuBlockIcon.classList.add('widget-button', 'widget-icon-resize-block')
  resizeMenuBlockIcon.addEventListener('mouseenter', () => {
    showResizeMenuBlock(resizeMenuBlockIcon, widgetWrapper)
  })

  resizeMenuBlockIcon.addEventListener('mouseleave', (event) => {
    logger.log('Mouse left resize menu block icon')
    const related = /** @type {?HTMLElement} */(event.relatedTarget)
    if (!related || !related.closest('.resize-menu-block')) {
      debouncedHideResizeMenuBlock(widgetWrapper)
    }
  })

  const dragHandle = document.createElement('span')
  dragHandle.classList.add('widget-button', 'widget-icon-drag')
  dragHandle.innerHTML = emojiList.pinching.icon
  dragHandle.draggable = true
  widgetMenu.appendChild(dragHandle)

  const fullScreenButton = document.createElement('button')
  fullScreenButton.innerHTML = emojiList.fullscreen.unicode
  fullScreenButton.classList.add('widget-button', 'widget-icon-fullscreen')
  fullScreenButton.addEventListener('click', event => {
    event.preventDefault()
    toggleFullScreen(widgetWrapper)
  })

  widgetMenu.appendChild(fullScreenButton)

  widgetMenu.appendChild(removeButton)
  widgetMenu.appendChild(configureButton)
  widgetMenu.appendChild(resizeMenuIcon)
  widgetMenu.appendChild(resizeMenuBlockIcon)

  widgetWrapper.appendChild(iframe)
  widgetWrapper.appendChild(widgetMenu)

  dragHandle.addEventListener('dragstart', (e) => {
    logger.log('Drag start event triggered')
    e.dataTransfer.setData('text/plain', widgetWrapper.dataset.dataid)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setDragImage(widgetWrapper, 0, 0)
    widgetWrapper.classList.add('dragging')
    handleDragStart(e, widgetWrapper)
  })

  dragHandle.addEventListener('dragend', (e) => {
    logger.log('Drag end event triggered')
    widgetWrapper.classList.remove('dragging')
    handleDragEnd(e)
  })

  logger.log('Drag start event listener attached to drag handle')
  logger.log('Widget created with grid spans:', {
    columns: gridColumnSpan,
    rows: gridRowSpan
  })

  return widgetWrapper
}

/**
 * Insert a widget into the current view and persist the layout.
 *
 * @param {string} url - URL of the service to embed.
 * @param {number} [columns=1] - Grid columns spanned by the widget.
 * @param {number} [rows=1] - Grid rows spanned by the widget.
 * @param {string} [type='iframe'] - Widget type, usually 'iframe'.
 * @param {?string} [boardId] - Board id; defaults to the active board.
 * @param {?string} [viewId] - View id; defaults to the active view.
 * @param {?string} [dataid=null] - Persistent widget identifier.
 * @param {string|number} [version='1'] - Widget version for cache validation.
 * @param {boolean} [deferMount=false] - Defer DOM insertion with cancellation support.
 * @function addWidget
 * @returns {Promise<void>} Resolves when the widget is added.
 */
async function addWidget (url, columns = 1, rows = 1, type = 'iframe', boardId, viewId, dataid = null, version = '1', deferMount = false) {
  logger.log('Adding widget with URL:', url)

  const widgetContainer = document.getElementById('widget-container')
  if (!widgetContainer) {
    logger.error('Widget container not found')
    return
  }

  // Default to current board and view if not provided
  boardId = boardId || window.asd.currentBoardId
  viewId = viewId || window.asd.currentViewId

  const service = await getServiceFromUrl(url)
  logger.log('Extracted service:', service)

  const cache = isCacheDisabled() ? null : getCache()
  let widgetWrapper
  let cacheHit = false

  if (cache && dataid) {
    const cached = cache.get(dataid)
    if (cached && cached.dataset.version === String(version)) {
      widgetWrapper = cached
      cacheHit = true
      const iframe = cached.querySelector('iframe')
      try {
        if (iframe && iframe.contentWindow && iframe.contentWindow.origin === window.origin) {
          iframe.contentWindow.postMessage({ type: 'WIDGET_REUSE' }, '*')
        }
      } catch {}
    } else {
      widgetWrapper = await createWidget(service, url, columns, rows, dataid, version)
      cache.set(widgetWrapper.dataset.dataid, widgetWrapper)
    }
  } else {
    widgetWrapper = await createWidget(service, url, columns, rows, dataid, version)
    if (cache) {
      cache.set(widgetWrapper.dataset.dataid, widgetWrapper)
    }
  }

  widgetWrapper.setAttribute('data-order', String(widgetContainer.children.length))
  widgetWrapper.dataset.cache = cacheHit ? 'hit' : 'miss'

  const devOverlay = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) ||
    (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') ||
    window.location.hostname === 'localhost'
  if (devOverlay) {
    let overlay = widgetWrapper.querySelector('.widget-debug-overlay')
    if (!overlay) {
      overlay = document.createElement('div')
      overlay.className = 'widget-debug-overlay'
      widgetWrapper.appendChild(overlay)
    }
    const size = cache ? cache.stats().size : 0
    overlay.textContent = `${widgetWrapper.dataset.dataid} ${cacheHit ? 'cache hit' : 'cache miss'} ${size}`
  }

  if (deferMount) {
    const cancelMount = deferredMount(widgetContainer, widgetWrapper)
    pendingMounts.push(cancelMount)
  } else {
    widgetContainer.appendChild(widgetWrapper)
  }

  logger.log('Widget prepared and scheduled for mount:', widgetWrapper)

  const services = await fetchServices()
  const serviceObj = services.find(s => s.name === service)
  if (serviceObj && serviceObj.type === 'api') {
    fetchData(url, data => {
      const iframe = widgetWrapper.querySelector('iframe')
      iframe.contentWindow.postMessage(data, '*')
      logger.log('Data posted to iframe for API service:', data)
    })
  }

  logger.log(`Saving widget state for board ${boardId} and view ${viewId}`)
  saveWidgetState(boardId, viewId)

  // Initialize resize handles for the newly added widget
  initializeResizeHandles()
}

/**
 * Remove a widget from the DOM and update ordering information.
 * Persist the resulting widget layout using {@link saveWidgetState}.
 *
 * @param {HTMLElement} widgetElement - Wrapper element to remove.
 * @function removeWidget
 * @returns {void}
 */
function removeWidget (widgetElement) {
  const dataid = widgetElement.dataset.dataid
  widgetElement.remove()
  logger.log('Widget removed with dataid:', dataid)
  updateWidgetOrders()
  const boardId = window.asd.currentBoardId
  const viewId = window.asd.currentViewId
  logger.log(`Saving widget state after removal for board ${boardId} and view ${viewId}`)
  saveWidgetState(boardId, viewId)
}

async function configureWidget (iframeElement) {
  const newUrl = prompt('Enter new URL for the widget:', iframeElement.src)
  if (newUrl) {
    const service = await getServiceFromUrl(newUrl)
    const services = await fetchServices()
    const serviceObj = services.find(s => s.name === service)
    iframeElement.src = newUrl
    if (serviceObj && serviceObj.type === 'api') {
      fetchData(newUrl, data => {
        iframeElement.contentWindow.postMessage(data, '*')
        logger.log('Data posted to iframe for API service:', data)
      })
    }
    const boardId = window.asd.currentBoardId
    const viewId = window.asd.currentViewId
    logger.log(`Saving widget state after configuration for board ${boardId} and view ${viewId}`)
    saveWidgetState(boardId, viewId)
  }
}

/**
 * Recompute and store the ordering of widgets in the container.
 * Saves the updated arrangement via {@link saveWidgetState}.
 *
 * @function updateWidgetOrders
 * @returns {void}
 */
function updateWidgetOrders () {
  const widgetContainer = document.getElementById('widget-container')
  const widgets = Array.from(widgetContainer.children)

  widgets.forEach((widget, index) => {
    const el = /** @type {HTMLElement} */(widget)
    el.setAttribute('data-order', String(index))
    el.style.order = String(index)
    logger.log('Updated widget order:', {
      dataid: el.dataset.dataid,
      order: index
    })
  })

  const boardId = window.asd.currentBoardId
  const viewId = window.asd.currentViewId
  logger.log(`Saving widget state after updating orders for board ${boardId} and view ${viewId}`)
  saveWidgetState(boardId, viewId)
}

export { addWidget, removeWidget, updateWidgetOrders, createWidget, clearPendingMounts }
