// @ts-check
/**
 * Drag and drop handlers for reordering widgets.
 *
 * @module dragDrop
 */
import { updateWidgetOrders } from '../widgetManagement.js'
import { Logger } from '../../../utils/Logger.js'

const logger = new Logger('dragDrop.js')

function handleDragStart (e, draggedWidgetWrapper) {
  const widgetDataId = draggedWidgetWrapper.dataset.dataid
  e.dataTransfer.setData('text/plain', widgetDataId)
  e.dataTransfer.effectAllowed = 'move'
  logger.log('Drag started for widget with data-id:', widgetDataId)

  const widgetContainer = document.getElementById('widget-container')
  const widgets = Array.from(widgetContainer.children).filter(el => (el instanceof HTMLElement) && el.style.display !== 'none')
  widgets.forEach(widget => {
    if (widget !== draggedWidgetWrapper) {
      addDragOverlay(/** @type {HTMLElement} */(widget))
    }
  })
}

function handleDragEnd (e) {
  const widgetContainer = document.getElementById('widget-container')
  const widgets = Array.from(widgetContainer.children)
  widgets.forEach(widget => {
    const el = /** @type {HTMLElement} */(widget)
    removeDragOverlay(el)
    el.classList.remove('drag-over', 'dragging')
  })
}

function addDragOverlay (widgetWrapper) {
  const dragOverlay = document.createElement('div')
  dragOverlay.classList.add('drag-overlay')
  Object.assign(dragOverlay.style, {
    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', zIndex: '10000', backgroundColor: 'rgba(0,0,0,0)'
  })

  dragOverlay.addEventListener('dragover', (e) => { e.preventDefault(); handleDragOver(e, widgetWrapper) })
  dragOverlay.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); handleDrop(e, widgetWrapper) })
  widgetWrapper.appendChild(dragOverlay)
  widgetWrapper.classList.add('has-overlay')
}

function removeDragOverlay (widgetWrapper) {
  const dragOverlay = widgetWrapper.querySelector('.drag-overlay')
  if (dragOverlay) dragOverlay.remove()
  widgetWrapper.classList.remove('has-overlay', 'highlight-drop-area')
}

function handleDrop (e, targetWidgetWrapper) {
  e.preventDefault()
  if (!targetWidgetWrapper) return

  const draggedId = e.dataTransfer.getData('text/plain')
  const widgetContainer = document.getElementById('widget-container')
  const draggedWidget = /** @type {HTMLElement} */(widgetContainer.querySelector(`[data-dataid='${draggedId}']`))

  if (!draggedWidget) return

  const draggedOrder = draggedWidget.getAttribute('data-order')
  const targetOrder = targetWidgetWrapper.getAttribute('data-order')

  logger.log(`Swapping order: Dragged (${draggedOrder}) with Target (${targetOrder})`)

  draggedWidget.setAttribute('data-order', targetOrder)
  targetWidgetWrapper.setAttribute('data-order', draggedOrder)
  draggedWidget.style.order = targetOrder
  targetWidgetWrapper.style.order = draggedOrder

  updateWidgetOrders()
}

function handleDragOver (e, widgetWrapper) {
  e.preventDefault()
  widgetWrapper.classList.add('drag-over', 'highlight-drop-area')
}

function handleDragLeave (e, widgetWrapper) {
  widgetWrapper.classList.remove('drag-over', 'highlight-drop-area')
}

function initializeDragAndDrop () {
  const widgetContainer = document.getElementById('widget-container')
  widgetContainer.addEventListener('dragover', (e) => { e.preventDefault() })
  logger.log('Drag and drop functionality initialized')
}

export { handleDragStart, handleDragEnd, handleDrop, handleDragOver, handleDragLeave, initializeDragAndDrop }
