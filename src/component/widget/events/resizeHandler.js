// @ts-check
/**
 * Provides interactive resizing of widgets via mouse drag handles.
 *
 * @module resizeHandler
 */
import { saveWidgetState } from '../../../storage/widgetStatePersister.js'
import { debounce } from '../../../utils/utils.js'
import { Logger } from '../../../utils/Logger.js'
import StorageManager from '../../../storage/StorageManager.js'

const logger = new Logger('resizeHandler.js')

/**
 * Append resize handles to all widgets and register listeners.
 *
 * @function initializeResizeHandles
 * @returns {void}
 */
export function initializeResizeHandles () {
  const widgets = document.querySelectorAll('.widget')
  logger.info(`Found ${widgets.length} widgets to initialize resize handles.`)

  widgets.forEach((widget, index) => {
    logger.info(`Initializing resize handle for widget index: ${index}`)
    const resizeHandle = document.createElement('div')
    resizeHandle.className = 'resize-handle'
    const el = /** @type {HTMLElement} */(widget)
    el.appendChild(resizeHandle)

    logger.info('Appended resize handle:', resizeHandle)

    resizeHandle.addEventListener('mousedown', async (event) => {
      event.preventDefault()
      try {
        await handleResizeStart(event, /** @type {HTMLElement} */(widget))
      } catch (error) {
        logger.error('Error during resize start:', error)
      }
    })
  })
}

/**
 * Creates a full-screen overlay to capture mouse events during resizing.
 * @function createResizeOverlay
 * @returns {HTMLDivElement} The created overlay element.
 */
function createResizeOverlay () {
  const overlay = document.createElement('div')
  overlay.className = 'resize-overlay'
  overlay.style.position = 'fixed'
  overlay.style.top = '0'
  overlay.style.left = '0'
  overlay.style.width = '100%'
  overlay.style.height = '100%'
  overlay.style.zIndex = '1000' // Ensure it is above all other elements
  document.body.appendChild(overlay)
  return overlay
}

/**
 * Start tracking mouse movement for resizing a widget.
 *
 * @param {MouseEvent} event - Mousedown event that initiated resize.
 * @param {HTMLElement} widget - The widget element being resized.
 * @function handleResizeStart
 * @returns {Promise<void>}
 */
async function handleResizeStart (event, widget) {
  const startX = event.clientX
  const startY = event.clientY
  const startWidth = widget.offsetWidth
  const startHeight = widget.offsetHeight

  const widgetUrl = widget.dataset.url
  const serviceConfig = StorageManager.getServices().find(service => service.url === widgetUrl)?.config || {}

  const gridColumns = serviceConfig.maxColumns || StorageManager.getConfig().styling.widget.maxColumns
  const gridRows = serviceConfig.maxRows || StorageManager.getConfig().styling.widget.maxRows

  const gridColumnSize = widget.parentElement.offsetWidth / gridColumns || 1
  const gridRowSize = widget.parentElement.offsetHeight / gridRows || 1

  // Add the resizing class to the widget
  widget.classList.add('resizing')

  // Create and append an overlay to capture all mouse events
  const overlay = createResizeOverlay()

  const debouncedSave = debounce(() => {
    saveWidgetState()
    logger.info('Resize stopped and widget state saved.')
  }, 300)

  /**
   * Handles mouse movement during a resize operation, updating the widget's grid span.
   * @function handleResize
   * @param {MouseEvent} event - The mousemove event.
   * @returns {void}
   */
  function handleResize (event) {
    try {
      const newWidth = Math.max(1, Math.round((startWidth + event.clientX - startX) / gridColumnSize))
      const newHeight = Math.max(1, Math.round((startHeight + event.clientY - startY) / gridRowSize))
      // Snap the resize values to the grid
      const snappedWidth = Math.round(newWidth / 1) * 1 // Adjust this if grid size should snap at different intervals
      const snappedHeight = Math.round(newHeight / 1) * 1

      widget.style.gridColumn = `span ${snappedWidth}`
      widget.style.gridRow = `span ${snappedHeight}`
      widget.dataset.columns = String(snappedWidth)
      widget.dataset.rows = String(snappedHeight)

      logger.info(`Widget resized to columns: ${snappedWidth}, rows: ${snappedHeight}`)
    } catch (error) {
      logger.error('Error during widget resize:', error)
    }
  }

  /**
   * Handles the end of a resize operation, cleaning up listeners and saving state.
   * @function stopResize
   * @returns {void}
   */
  function stopResize () {
    try {
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResize)

      // Remove the resizing class from the widget
      widget.classList.remove('resizing')

      // Remove the overlay
      document.body.removeChild(overlay)

      debouncedSave()
    } catch (error) {
      logger.error('Error stopping resize:', error)
    }
  }

  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}
