// @ts-check
/**
 * Drag and drop handlers for reordering widgets. This file is based on the original
 * working version, with minimal changes for async safety and stable IDs.
 *
 * @module dragDrop
 */
import { updateWidgetOrders } from '../widgetManagement.js'
import { Logger } from '../../../utils/Logger.js'

const logger = new Logger('dragDrop.js')

// --- Event Handlers ---

function handleDragStart (e, draggedWidgetWrapper) {
  // FIX 1: Use the stable `data-dataid` for data transfer.
  const widgetId = draggedWidgetWrapper.dataset.dataid
  logger.log('Drag started for widget with data-id:', widgetId)
  e.dataTransfer.setData('text/plain', widgetId)
  e.dataTransfer.effectAllowed = 'move'

  // This is your proven overlay logic. We keep it.
  const widgetContainer = document.getElementById('widget-container')
  const widgets = Array.from(widgetContainer.children)
  widgets.forEach(widget => {
    const el = /** @type {HTMLElement} */ (widget)
    if (el !== draggedWidgetWrapper && el.style.display !== 'none') {
      addDragOverlay(el)
    }
  })
}

function handleDragEnd (e) {
  logger.log('Drag End triggered.')
  // Your proven cleanup logic. This removes overlays and visual styles.
  const widgetContainer = document.getElementById('widget-container')
  widgetContainer.querySelectorAll('.widget-wrapper').forEach(widget => {
    removeDragOverlay(widget)
    widget.classList.remove('drag-over', 'highlight-drop-area')
  })
}

// FIX 2: The drop handler is now async to await the save operation.
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

  logger.log(`Drop event: dragged order ${draggedOrder} onto target order ${targetOrder}`)

  if (draggedOrder < targetOrder) {
    targetWidgetWrapper.after(draggedWidget)
  } else {
    targetWidgetWrapper.before(draggedWidget)
  }

  // This await fixes the race condition in tests.
  await updateWidgetOrders()
}

function handleDragOver (e, widgetWrapper) {
  e.preventDefault() // This is required to allow a drop.
  widgetWrapper.classList.add('drag-over', 'highlight-drop-area')
}

function handleDragLeave (e, widgetWrapper) {
  widgetWrapper.classList.remove('drag-over', 'highlight-drop-area')
}

// --- Helper Functions (Your original, working overlay logic) ---
// You were right to question my comment; this logic is central, not just a helper.

function addDragOverlay (widgetWrapper) {
  const dragOverlay = document.createElement('div')
  dragOverlay.classList.add('drag-overlay')
  Object.assign(dragOverlay.style, {
    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', zIndex: '10'
  })

  dragOverlay.addEventListener('dragover', (ev) => handleDragOver(ev, widgetWrapper))
  dragOverlay.addEventListener('dragleave', (ev) => handleDragLeave(ev, widgetWrapper))
  dragOverlay.addEventListener('drop', (ev) => handleDrop(ev, widgetWrapper))

  widgetWrapper.appendChild(dragOverlay)
}

function removeDragOverlay (widgetWrapper) {
  const dragOverlay = widgetWrapper.querySelector('.drag-overlay')
  if (dragOverlay) {
    dragOverlay.remove()
  }
}

function initializeDragAndDrop () {
  // No container-level listeners are needed with this overlay approach.
  logger.log('Drag and drop handlers are ready to be attached on drag start.')
}

// Export the functions needed by widgetManagement.js
export { handleDragStart, handleDragEnd, initializeDragAndDrop }
