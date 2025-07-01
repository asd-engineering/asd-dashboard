// @ts-check
/**
 * Drag and drop handlers for reordering widgets.
 *
 * @module dragDrop
 */
import { updateWidgetOrders } from '../widgetManagement.js'
import { Logger } from '../../../utils/Logger.js'

const logger = new Logger('dragDrop.js')

/**
 * Begin dragging a widget by setting up transfer data and overlays.
 *
 * @param {DragEvent} e - The dragstart event.
 * @param {HTMLElement} draggedWidgetWrapper - The widget being dragged.
 * @function handleDragStart
 * @returns {void}
 */
function handleDragStart (e, draggedWidgetWrapper) {
  const widgetOrder = draggedWidgetWrapper.getAttribute('data-order')
  logger.log('Drag started for widget with order:', widgetOrder)
  e.dataTransfer.setData('text/plain', widgetOrder)
  e.dataTransfer.effectAllowed = 'move'
  logger.log('Data transfer set with widget order:', widgetOrder)

  const widgetContainer = document.getElementById('widget-container')
  // Add overlays only to other visible widgets
  const widgets = Array.from(widgetContainer.children).filter(el => (el instanceof HTMLElement) && el.style.display !== 'none')
  widgets.forEach(widget => {
    if (widget !== draggedWidgetWrapper) {
      addDragOverlay(/** @type {HTMLElement} */(widget))
    }
  })
}

/**
 * Clean up after a drag operation ends.
 *
 * @param {DragEvent} e - The dragend event.
 * @function handleDragEnd
 * @returns {void}
 */
function handleDragEnd (e) {
  const widgetContainer = document.getElementById('widget-container')
  const widgets = Array.from(widgetContainer.children)
  widgets.forEach(widget => {
    const el = /** @type {HTMLElement} */(widget)
    removeDragOverlay(el)
    el.classList.remove('drag-over')
  })
}

/**
 * Insert a transparent overlay to mark a widget as a drop target.
 *
 * @param {HTMLElement} widgetWrapper - Widget element to overlay.
 * @function addDragOverlay
 * @returns {void}
 */
function addDragOverlay (widgetWrapper) {
  const dragOverlay = document.createElement('div')
  dragOverlay.classList.add('drag-overlay')

  Object.assign(dragOverlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '10000',
    backgroundColor: 'rgba(0, 0, 0, 0)'
  })

  dragOverlay.addEventListener('dragover', (e) => {
    e.preventDefault()
    handleDragOver(e, widgetWrapper)
  })

  dragOverlay.addEventListener('drop', (e) => {
    e.preventDefault()
    e.stopPropagation()
    handleDrop(e, widgetWrapper)
  })

  widgetWrapper.appendChild(dragOverlay)
  widgetWrapper.classList.add('has-overlay')
}

/**
 * Remove the overlay from a widget wrapper if present.
 *
 * @param {HTMLElement} widgetWrapper - Widget element to clean up.
 * @function removeDragOverlay
 * @returns {void}
 */
function removeDragOverlay (widgetWrapper) {
  const dragOverlay = widgetWrapper.querySelector('.drag-overlay')
  if (dragOverlay) {
    dragOverlay.remove()
  }
  widgetWrapper.classList.remove('has-overlay', 'highlight-drop-area')
}

/**
 * Drop handler to rearrange widgets or reposition them on the grid.
 *
 * @param {DragEvent} e - The drop event.
 * @param {?HTMLElement} targetWidgetWrapper - Widget wrapper receiving the drop or null.
 * @function handleDrop
 * @returns {void}
 */
function handleDrop (e, targetWidgetWrapper) {
  e.preventDefault()
  logger.log('Drop event on overlay for widget:', targetWidgetWrapper)

  const draggedOrder = e.dataTransfer.getData('text/plain')
  const widgetContainer = document.getElementById('widget-container')
  const draggedWidget = /** @type {HTMLElement} */(widgetContainer.querySelector(`[data-order='${draggedOrder}']`))

  if (!draggedWidget) {
    logger.error('Invalid dragged widget element', 3000, 'error')
    return
  }

  // Dropping on another widget (swapping order)
  if (targetWidgetWrapper) {
    logger.log('Before rearrangement:', {
      draggedWidgetOrder: draggedWidget.style.order,
      targetWidgetOrder: targetWidgetWrapper.style.order
    })

    const tempOrder = draggedWidget.style.order
    draggedWidget.style.order = targetWidgetWrapper.style.order
    targetWidgetWrapper.style.order = tempOrder
  } else { // Dropping on an empty space
    const gridColumnCount = parseInt(getComputedStyle(widgetContainer).getPropertyValue('grid-template-columns').split(' ').length.toString(), 10)
    let targetColumn = Math.floor(e.clientX / draggedWidget.offsetWidth)
    let targetRow = Math.floor(e.clientY / draggedWidget.offsetHeight)

    targetColumn = Math.min(Math.max(targetColumn, 0), gridColumnCount - 1)
    targetRow = Math.max(targetRow, 0)

    draggedWidget.style.gridColumnStart = (targetColumn + 1).toString()
    draggedWidget.style.gridRowStart = (targetRow + 1).toString()

    logger.log('Widget moved to new grid position:', {
      column: targetColumn + 1,
      row: targetRow + 1
    })
  }

  const updatedWidgets = Array.from(widgetContainer.children)
  updatedWidgets.forEach(widget => widget.classList.remove('drag-over'))

  updateWidgetOrders()
  draggedWidget.classList.remove('dragging')
}

/**
 * Highlight a widget as a potential drop target.
 *
 * @param {DragEvent} e - The dragover event.
 * @param {HTMLElement} widgetWrapper - The widget element hovered over.
 * @function handleDragOver
 * @returns {void}
 */
function handleDragOver (e, widgetWrapper) {
  e.preventDefault()
  widgetWrapper.classList.add('drag-over', 'highlight-drop-area')
}

/**
 * Remove highlighting when a dragged item leaves a widget.
 *
 * @param {DragEvent} e - The dragleave event.
 * @param {HTMLElement} widgetWrapper - Widget that lost drag focus.
 * @function handleDragLeave
 * @returns {void}
 */
function handleDragLeave (e, widgetWrapper) {
  widgetWrapper.classList.remove('drag-over', 'highlight-drop-area')
}

/**
 * Enable drag-and-drop events on the widget container.
 *
 * @function initializeDragAndDrop
 * @returns {void}
 */
function initializeDragAndDrop () {
  const widgetContainer = document.getElementById('widget-container')

  // This listener handles drag over the main container (for visual feedback)
  widgetContainer.addEventListener('dragover', (e) => {
    e.preventDefault()
  })

  // This listener handles drops into empty space on the container
  widgetContainer.addEventListener('drop', (e) => {
    e.preventDefault()
    // A drop on a widget is handled by its overlay, which stops propagation.
    // If propagation was not stopped, the event reached the container.
    // We check if the direct target is the container itself.
    if (e.target === widgetContainer) {
      handleDrop(e, null)
    }
  })

  logger.log('Drag and drop functionality initialized')
}

export { handleDragStart, handleDragEnd, handleDrop, handleDragOver, handleDragLeave, initializeDragAndDrop }
