// @ts-check
/**
 * Drag and drop handlers for reordering widgets.
 *
 * @module dragDrop
 */
import { updateWidgetOrders } from '../widgetManagement.js'
import { saveWidgetState } from '../../../storage/localStorage.js'
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
  const widgets = Array.from(widgetContainer.children)
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

  dragOverlay.style.position = 'absolute'
  dragOverlay.style.top = '0'
  dragOverlay.style.left = '0'
  dragOverlay.style.width = '100%'
  dragOverlay.style.height = '100%'
  dragOverlay.style.zIndex = '10000'
  dragOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)'

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
  const targetOrder = targetWidgetWrapper ? targetWidgetWrapper.getAttribute('data-order') : null

  logger.log(`Drop event: draggedOrder=${draggedOrder}, targetOrder=${targetOrder}`)

  const widgetContainer = document.getElementById('widget-container')
  const draggedWidget = widgetContainer.querySelector(`[data-order='${draggedOrder}']`)

  if (!draggedWidget) {
    logger.error('Invalid dragged widget element', 3000, 'error')
    return
  }

  if (targetOrder !== null) {
    const targetWidget = widgetContainer.querySelector(`[data-order='${targetOrder}']`)
    if (!targetWidget) {
      logger.error('Invalid target widget element', 3000, 'error')
      return
    }

    logger.log('Before rearrangement:', {
      draggedWidgetOrder: draggedWidget.getAttribute('data-order'),
      targetWidgetOrder: targetWidget.getAttribute('data-order')
    })

    widgetContainer.removeChild(draggedWidget)

    if (parseInt(draggedOrder) < parseInt(targetOrder)) {
      if (targetWidget.nextSibling) {
        widgetContainer.insertBefore(draggedWidget, targetWidget.nextSibling)
      } else {
        widgetContainer.appendChild(draggedWidget)
      }
    } else {
      widgetContainer.insertBefore(draggedWidget, targetWidget)
    }
  } else {
    // Calculate nearest available grid position
    const gridColumnCount = parseInt(getComputedStyle(widgetContainer).getPropertyValue('grid-template-columns').split(' ').length.toString(), 10)
    const draggedEl = /** @type {HTMLElement} */(draggedWidget)
    let targetColumn = Math.floor(e.clientX / draggedEl.offsetWidth)
    let targetRow = Math.floor(e.clientY / draggedEl.offsetHeight)

    // Adjust to fit within grid boundaries
    targetColumn = Math.min(targetColumn, gridColumnCount - 1)
    targetColumn = Math.max(targetColumn, 0)
    targetRow = Math.max(targetRow, 0)

    draggedEl.style.gridColumnStart = (targetColumn + 1).toString()
    draggedEl.style.gridRowStart = (targetRow + 1).toString()

    logger.log('Widget moved to new grid position:', {
      column: targetColumn + 1,
      row: targetRow + 1
    })
  }

  const updatedWidgets = Array.from(widgetContainer.children)
  updatedWidgets.forEach(widget => widget.classList.remove('drag-over'))

  updateWidgetOrders()

  // Update localStorage with new widget position
  const widgetId = (/** @type {HTMLElement} */(draggedWidget)).dataset.dataid
  const boardId = window.asd.currentBoardId
  const viewId = window.asd.currentViewId
  const widgetState = JSON.parse(localStorage.getItem('widgetState')) || {}

  if (!widgetState[boardId]) {
    widgetState[boardId] = {}
  }

  if (!widgetState[boardId][viewId]) {
    widgetState[boardId][viewId] = []
  }

  const widgetIndex = widgetState[boardId][viewId].findIndex(widget => widget.dataid === widgetId)
  if (widgetIndex !== -1) {
    widgetState[boardId][viewId][widgetIndex].column = parseInt((/** @type {HTMLElement} */(draggedWidget)).style.gridColumnStart)
    widgetState[boardId][viewId][widgetIndex].row = parseInt((/** @type {HTMLElement} */(draggedWidget)).style.gridRowStart)
  }

  localStorage.setItem('widgetState', JSON.stringify(widgetState))
  saveWidgetState(boardId, viewId)

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
  logger.log('Drag over event on overlay for widget:', widgetWrapper)
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
  logger.log('Drag leave event on overlay for widget:', widgetWrapper)
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
  widgetContainer.addEventListener('dragover', (e) => {
    e.preventDefault()
    const dragOverTarget = (/** @type {HTMLElement} */(e.target)).closest('.widget-wrapper')
    if (dragOverTarget) {
      dragOverTarget.classList.add('drag-over', 'highlight-drop-area')
    }
  })

  widgetContainer.addEventListener('dragleave', (e) => {
    const dragLeaveTarget = (/** @type {HTMLElement} */(e.target)).closest('.widget-wrapper')
    if (dragLeaveTarget) {
      dragLeaveTarget.classList.remove('drag-over', 'highlight-drop-area')
    }
  })

  widgetContainer.addEventListener('drop', (e) => {
    e.preventDefault()
    const draggedOrder = e.dataTransfer.getData('text/plain')
    const targetWidgetWrapper = (/** @type {HTMLElement} */(e.target)).closest('.widget-wrapper')
    const targetOrder = targetWidgetWrapper ? targetWidgetWrapper.getAttribute('data-order') : null

    if (draggedOrder !== null) {
      const widgets = Array.from(widgetContainer.children)
      const draggedWidgetEl = widgets.find(widget => widget.getAttribute('data-order') === draggedOrder)

      if (draggedWidgetEl) {
        const draggedWidget = /** @type {HTMLElement} */(draggedWidgetEl)
        if (targetOrder !== null) {
          const targetWidgetEl = widgets.find(widget => widget.getAttribute('data-order') === targetOrder)
          if (targetWidgetEl) {
            const targetWidget = /** @type {HTMLElement} */(targetWidgetEl)
            // Swap orders
            draggedWidget.setAttribute('data-order', targetOrder)
            targetWidget.setAttribute('data-order', draggedOrder)

            // Update CSS order
            draggedWidget.style.order = targetOrder.toString()
            targetWidget.style.order = draggedOrder.toString()
          }
        } else {
          // Handle drop in open space
          handleDrop(e, null)
        }

        // Save the new state
        saveWidgetState(window.asd.currentBoardId, window.asd.currentViewId)
      }
    }
  })

  logger.log('Drag and drop functionality initialized')
}

export { handleDragStart, handleDragEnd, handleDrop, handleDragOver, handleDragLeave, initializeDragAndDrop }
