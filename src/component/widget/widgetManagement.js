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
import { widgetGetUUID } from '../../utils/id.js'

const logger = new Logger('widgetManagement.js')

async function createWidget (service, url, gridColumnSpan = 1, gridRowSpan = 1, dataid = null) {
  logger.log('Creating widget with URL:', url)
  const config = await getConfig()
  const services = await fetchServices()
  const serviceObj = services.find(s => s.name === service) || {}

  const minColumns = serviceObj.config?.minColumns || config.styling.widget.minColumns
  const maxColumns = serviceObj.config?.maxColumns || config.styling.widget.maxColumns
  const minRows = serviceObj.config?.minRows || config.styling.widget.minRows
  const maxRows = serviceObj.config?.maxRows || config.styling.widget.maxRows

  const widgetWrapper = document.createElement('div')
  widgetWrapper.className = 'widget-wrapper widget'
  widgetWrapper.style.position = 'relative'
  widgetWrapper.dataset.service = service
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
  iframe.src = url
  iframe.loading = 'lazy'
  iframe.style.border = '1px solid #ccc'
  iframe.style.width = '100%'
  iframe.style.height = '100%'

  const widgetMenu = document.createElement('div')
  widgetMenu.classList.add('widget-menu')

  if (serviceObj && serviceObj.fallback) {
    const fixServiceButton = document.createElement('button')
    fixServiceButton.innerHTML = emojiList.launch.unicode
    fixServiceButton.classList.add('widget-button', 'widget-icon-action')
    fixServiceButton.onclick = () => showServiceModal(serviceObj, widgetWrapper)
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

  const buttonDebounce = 200
  const debouncedHideResizeMenu = debounce((icon) => hideResizeMenu(icon), buttonDebounce)
  const debouncedHideResizeMenuBlock = debounce((widgetWrapper) => hideResizeMenuBlock(widgetWrapper), buttonDebounce)

  const resizeMenuIcon = document.createElement('button')
  resizeMenuIcon.innerHTML = emojiList.triangularRuler.unicode
  resizeMenuIcon.classList.add('widget-button', 'widget-icon-resize')
  resizeMenuIcon.addEventListener('mouseenter', () => showResizeMenu(resizeMenuIcon))
  resizeMenuIcon.addEventListener('mouseleave', (event) => {
    const related = /** @type {?HTMLElement} */(event.relatedTarget)
    if (!related || !related.closest('.resize-menu')) debouncedHideResizeMenu(resizeMenuIcon)
  })

  const resizeMenuBlockIcon = document.createElement('button')
  resizeMenuBlockIcon.innerHTML = emojiList.puzzle.unicode
  resizeMenuBlockIcon.classList.add('widget-button', 'widget-icon-resize-block')
  resizeMenuBlockIcon.addEventListener('mouseenter', () => showResizeMenuBlock(resizeMenuBlockIcon, widgetWrapper))
  resizeMenuBlockIcon.addEventListener('mouseleave', (event) => {
    const related = /** @type {?HTMLElement} */(event.relatedTarget)
    if (!related || !related.closest('.resize-menu-block')) debouncedHideResizeMenuBlock(widgetWrapper)
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

  widgetMenu.append(fullScreenButton, removeButton, configureButton, resizeMenuIcon, resizeMenuBlockIcon, dragHandle)
  widgetWrapper.append(iframe, widgetMenu)

  dragHandle.addEventListener('dragstart', (e) => {
    widgetWrapper.classList.add('dragging')
    handleDragStart(e, widgetWrapper)
  })
  dragHandle.addEventListener('dragend', handleDragEnd)

  return widgetWrapper
}

async function addWidget (url, columns = 1, rows = 1, type = 'iframe', boardId, viewId, dataid = null) {
  logger.log('Adding widget with URL:', url)
  const widgetContainer = document.getElementById('widget-container')
  if (!widgetContainer) return logger.error('Widget container not found')

  boardId = boardId || window.asd.currentBoardId
  viewId = viewId || window.asd.currentViewId

  if (dataid && window.asd.widgetStore.has(dataid)) {
    window.asd.widgetStore.show(dataid)
    return
  }

  const service = await getServiceFromUrl(url)
  const widgetWrapper = await createWidget(service, url, columns, rows, dataid)

  const visibleWidgetCount = Array.from(widgetContainer.children)
    .filter(el => (el instanceof HTMLElement) && el.style.display !== 'none').length
  widgetWrapper.setAttribute('data-order', String(visibleWidgetCount))
  widgetWrapper.style.order = String(visibleWidgetCount)

  widgetContainer.appendChild(widgetWrapper)
  window.asd.widgetStore.add(widgetWrapper)

  const services = await fetchServices()
  const serviceObj = services.find(s => s.name === service)
  if (serviceObj && serviceObj.type === 'api') {
    fetchData(url, data => {
      const iframe = widgetWrapper.querySelector('iframe')
      iframe.contentWindow.postMessage(data, '*')
    })
  }

  saveWidgetState(boardId, viewId)
  initializeResizeHandles()
}

function removeWidget (widgetElement) {
  const dataid = widgetElement.dataset.dataid
  window.asd.widgetStore.requestRemoval(dataid)
  updateWidgetOrders()
}

async function configureWidget (iframeElement) {
  const newUrl = prompt('Enter new URL for the widget:', iframeElement.src)
  if (newUrl) {
    iframeElement.src = newUrl
    saveWidgetState(window.asd.currentBoardId, window.asd.currentViewId)
  }
}

function updateWidgetOrders () {
  const boardId = window.asd.currentBoardId
  const viewId = window.asd.currentViewId
  if (boardId && viewId) {
    logger.log(`Triggering save widget state for board ${boardId} and view ${viewId}`)
    saveWidgetState(boardId, viewId)
  }
}

export { addWidget, removeWidget, updateWidgetOrders, createWidget }
