// @ts-check
/**
 * Drag and drop handlers for reordering widgets.
 * This version is a direct adaptation of the original working code, with minimal
 * changes to support stable IDs and async state saving.
 *
 * @module dragDrop
 */
import { updateWidgetOrders } from '../widgetManagement.js'
import { Logger } from '../../../utils/Logger.js'

const logger = new Logger('dragDrop.js')

// --- Event Handlers from Your Original Code ---

/**
 * Handles the start of a drag operation.
 * @function handleDragStart
 * @param {DragEvent} e - The dragstart event.
 * @param {HTMLElement} draggedWidgetWrapper - The widget element being dragged.
 * @returns {void}
 */
function handleDragStart (e, draggedWidgetWrapper) {
  // FIX #1: Use the stable `data-dataid` instead of the changing `data-order`.
  const widgetId = draggedWidgetWrapper.dataset.dataid
  logger.log('Drag started for widget with data-id:', widgetId)
  e.dataTransfer.setData('text/plain', widgetId)
  e.dataTransfer.effectAllowed = 'move'
  draggedWidgetWrapper.classList.add('dragging') // Add class for visual feedback

  // Your proven overlay logic. This is the correct way to handle drop targets.
  const widgetContainer = document.getElementById('widget-container')
  const widgets = Array.from(widgetContainer.children)
  widgets.forEach(widget => {
    if (widget !== draggedWidgetWrapper) {
      addDragOverlay(/** @type {HTMLElement} */(widget))
    }
  })
}

/**
 * Handles the end of a drag operation, cleaning up UI elements.
 * @function handleDragEnd
 * @param {DragEvent} e - The dragend event.
 * @returns {void}
 */
function handleDragEnd (e) {
  // Your proven cleanup logic. This removes all visual artifacts.
  logger.log('Drag End triggered. Cleaning up UI.')
  const widgetContainer = document.getElementById('widget-container')
  widgetContainer.querySelectorAll('.widget-wrapper').forEach(widget => {
    removeDragOverlay(widget)
    widget.classList.remove('drag-over', 'highlight-drop-area', 'dragging')
  })
}

// FIX #2: The drop handler MUST be async to await the state saving.
/**
 * Handles the drop event on a target widget.
 * @async
 * @function handleDrop
 * @param {DragEvent} e - The drop event.
 * @param {HTMLElement} targetWidgetWrapper - The widget being dropped on.
 * @returns {Promise<void>}
 */
async function handleDrop (e, targetWidgetWrapper) {
  e.preventDefault()
  e.stopPropagation()

  const draggedId = e.dataTransfer.getData('text/plain')
  const widgetContainer = document.getElementById('widget-container')
  const draggedWidget = widgetContainer.querySelector(`[data-dataid='${draggedId}']`)

  if (!draggedWidget || !targetWidgetWrapper) {
    logger.error('Drag or drop target is invalid.')
    return
  }

  // Your proven DOM reordering logic.
  const draggedOrder = parseInt(draggedWidget.getAttribute('data-order') || '0', 10)
  const targetOrder = parseInt(targetWidgetWrapper.getAttribute('data-order') || '0', 10)

  if (draggedOrder < targetOrder) {
    targetWidgetWrapper.after(draggedWidget)
  } else {
    targetWidgetWrapper.before(draggedWidget)
  }

  updateWidgetOrders()
}

/**
 * Handles the dragover event on a potential drop target.
 * @function handleDragOver
 * @param {DragEvent} e - The dragover event.
 * @param {HTMLElement} widgetWrapper - The widget being hovered over.
 * @returns {void}
 */
function handleDragOver (e, widgetWrapper) {
  e.preventDefault()
  widgetWrapper.classList.add('drag-over', 'highlight-drop-area')
}

/**
 * Handles the dragleave event on a potential drop target.
 * @function handleDragLeave
 * @param {DragEvent} e - The dragleave event.
 * @param {HTMLElement} widgetWrapper - The widget that the cursor is leaving.
 * @returns {void}
 */
function handleDragLeave (e, widgetWrapper) {
  widgetWrapper.classList.remove('drag-over', 'highlight-drop-area')
}

// --- Helper Functions (Your Original Overlay Logic) ---

/**
 * Adds a transparent overlay to a widget to act as a drop target.
 * @function addDragOverlay
 * @param {HTMLElement} widgetWrapper - The widget to add an overlay to.
 * @returns {void}
 */
function addDragOverlay (widgetWrapper) {
  const dragOverlay = document.createElement('div')
  dragOverlay.classList.add('drag-overlay')
  Object.assign(dragOverlay.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', zIndex: '10' })

  // Attach listeners to the overlay, just like in your original code.
  dragOverlay.addEventListener('dragover', (ev) => handleDragOver(ev, widgetWrapper))
  dragOverlay.addEventListener('dragleave', (ev) => handleDragLeave(ev, widgetWrapper))
  dragOverlay.addEventListener('drop', (ev) => handleDrop(ev, widgetWrapper))

  widgetWrapper.appendChild(dragOverlay)
}

/**
 * Removes the drag overlay from a widget.
 * @function removeDragOverlay
 * @param {HTMLElement} widgetWrapper - The widget to remove the overlay from.
 * @returns {void}
 */
function removeDragOverlay (widgetWrapper) {
  const dragOverlay = widgetWrapper.querySelector('.drag-overlay')
  if (dragOverlay) {
    dragOverlay.remove()
  }
}

// No container-level listeners are needed with this correct overlay model.
/**
 * Initializes the drag and drop functionality. In this model, it's a placeholder
 * as event listeners are attached dynamically during the drag operation.
 * @function initializeDragAndDrop
 * @returns {void}
 */
function initializeDragAndDrop () {
  logger.log('Drag and drop handlers are ready to be attached on drag start.')
}

// Export only the functions that widgetManagement.js needs to call.
export { handleDragStart, handleDragEnd, initializeDragAndDrop }
