/**
 * Provides interactive resizing of widgets via mouse drag handles.
 *
 * @module resizeHandler
 */
import { saveWidgetState } from '../../../storage/localStorage.js'
import { getCurrentBoardId, getCurrentViewId } from '../../../utils/elements.js'
// import { debounce } from '../../../utils/utils.js'
// The logger and debounce function makes resizeHandler.spec.ts flaky. Need to research why.
// Does the test not wait for the correct size of the widget?
import { Logger } from '../../../utils/Logger.js'

const logger = new Logger('resizeHandler.js')

/**
 * Append resize handles to all widgets and register listeners.
 *
 * @returns {void}
 */
export function initializeResizeHandles () {
  const widgets = document.querySelectorAll('.widget')
  logger.info(`Found ${widgets.length} widgets to initialize resize handles.`)

  widgets.forEach((widget, index) => {
    logger.info(`Initializing resize handle for widget index: ${index}`)
    const resizeHandle = document.createElement('div')
    resizeHandle.className = 'resize-handle'
    widget.appendChild(resizeHandle)

    logger.info('Appended resize handle:', resizeHandle)

    resizeHandle.addEventListener('mousedown', (event) => {
      event.preventDefault()
      handleResizeStart(event, widget)
    })
  })
}

function createResizeOverlay () {
  const overlay = document.createElement('div')
  overlay.className = 'resize-overlay'
  overlay.style.position = 'fixed'
  overlay.style.top = 0
  overlay.style.left = 0
  overlay.style.width = '100%'
  overlay.style.height = '100%'
  overlay.style.zIndex = 1000 // Ensure it is above all other elements
  document.body.appendChild(overlay)
  return overlay
}

/**
 * Start tracking mouse movement for resizing a widget.
 *
 * @param {MouseEvent} event - Mousedown event that initiated resize.
 * @param {HTMLElement} widget - The widget element being resized.
 * @returns {Promise<void>}
 */
async function handleResizeStart (event, widget) {
  const startX = event.clientX
  const startY = event.clientY
  const startWidth = widget.offsetWidth
  const startHeight = widget.offsetHeight

  const widgetUrl = widget.dataset.url
  const serviceConfig = window.asd.services.find(service => service.url === widgetUrl)?.config || {}

  const gridColumns = serviceConfig.maxColumns || window.asd.config.styling.widget.maxColumns
  const gridRows = serviceConfig.maxRows || window.asd.config.styling.widget.maxRows

  const gridColumnSize = widget.parentElement.offsetWidth / gridColumns || 1
  const gridRowSize = widget.parentElement.offsetHeight / gridRows || 1

  // Add the resizing class to the widget
  widget.classList.add('resizing')

  // Create and append an overlay to capture all mouse events
  const overlay = createResizeOverlay()

  function handleResize (event) {
    try {
      const newWidth = Math.max(1, Math.round((startWidth + event.clientX - startX) / gridColumnSize))
      const newHeight = Math.max(1, Math.round((startHeight + event.clientY - startY) / gridRowSize))
      // Snap the resize values to the grid
      const snappedWidth = Math.round(newWidth / 1) * 1 // Adjust this if grid size should snap at different intervals
      const snappedHeight = Math.round(newHeight / 1) * 1

      widget.style.gridColumn = `span ${snappedWidth}`
      widget.style.gridRow = `span ${snappedHeight}`
      widget.dataset.columns = snappedWidth
      widget.dataset.rows = snappedHeight

      logger.info(`Widget resized to columns: ${snappedWidth}, rows: ${snappedHeight}`)
    } catch (error) {
      logger.error('Error during widget resize:', error)
    }
  }

  function stopResize () {
    try {
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResize)

      // Remove the resizing class from the widget
      widget.classList.remove('resizing')

      // Remove the overlay
      document.body.removeChild(overlay)

      const boardId = getCurrentBoardId()
      const viewId = getCurrentViewId()
      saveWidgetState(boardId, viewId)
      logger.info('Resize stopped and widget state saved.')
    } catch (error) {
      logger.error('Error stopping resize:', error)
    }
  }

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}
