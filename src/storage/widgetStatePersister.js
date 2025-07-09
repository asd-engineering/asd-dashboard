// @ts-check
/**
 * Utility for persisting the current state of widgets into the in-memory board structure,
 * and then triggering a save to localStorage via the StorageManager.
 *
 * @module storage/widgetStatePersister
 */
import { Logger } from '../utils/Logger.js'
import StorageManager from './StorageManager.js'
import { getCurrentBoardId, getCurrentViewId } from '../utils/elements.js'

const logger = new Logger('widgetStatePersister.js')

/**
 * Converts a widget DOM element into a serializable state object.
 * @param {HTMLElement} widget - The widget element.
 * @returns {import('../types.js').Widget} A serializable widget state object.
 */
function serializeWidgetState (widget) {
  let metadata = {}
  if (widget.dataset.metadata) {
    try { metadata = JSON.parse(widget.dataset.metadata) } catch (e) { metadata = {} }
  }

  let settings = {}
  if (widget.dataset.settings) {
    try { settings = JSON.parse(widget.dataset.settings) } catch (e) { settings = {} }
  }

  return {
    dataid: widget.dataset.dataid,
    order: widget.getAttribute('data-order'),
    url: widget.querySelector('iframe').src,
    columns: widget.dataset.columns || '1',
    rows: widget.dataset.rows || '1',
    type: widget.dataset.type || 'iframe',
    metadata,
    settings
  }
}

/**
 * Merge visible widget state into the in-memory board and persist it.
 *
 * Retrieves the current state of all visible widgets for the specified view,
 * updates the in-memory board object accordingly, and then writes the
 * complete board structure to localStorage via the StorageManager.
 *
 * If either `boardId` or `viewId` is falsy, logs an error and aborts without saving.
 *
 * @param {string} [boardId=getCurrentBoardId()] - The board ID to update. Defaults to the current board.
 * @param {string} [viewId=getCurrentViewId()]   - The view ID to update. Defaults to the current view.
 * @returns {void}
 * @see StorageManager.save
 */
export function saveWidgetState (boardId = getCurrentBoardId(), viewId = getCurrentViewId()) {
  if (!boardId || !viewId) {
    return logger.error('Board ID or View ID is missing. Cannot save widget state.')
  }

  try {
    // Use the atomic update helper for all board modifications.
    StorageManager.updateBoards(boards => {
      const board = boards.find(b => b.id === boardId)
      if (!board) {
        logger.error(`Board not found for saving state: ${boardId}`)
        return // Exit the updater callback
      }

      const view = board.views.find(v => v.id === viewId)
      if (!view) {
        logger.error(`View not found for saving state: ${viewId}`)
        return // Exit the updater callback
      }

      const widgetContainer = document.getElementById('widget-container')
      const visibleWidgets = Array.from(widgetContainer.children)
        .filter(el => (el instanceof HTMLElement) && el.style.display !== 'none')

      const sortedVisibleWidgets = visibleWidgets.sort((a, b) => {
        const orderA = parseInt(/** @type {HTMLElement} */(a).getAttribute('data-order') || '0', 10)
        const orderB = parseInt(/** @type {HTMLElement} */(b).getAttribute('data-order') || '0', 10)
        return orderA - orderB
      })

      sortedVisibleWidgets.forEach((widget, index) => {
        (/** @type {HTMLElement} */(widget)).setAttribute('data-order', String(index))
        ;(/** @type {HTMLElement} */(widget)).style.order = String(index)
      })

      // Mutate the board state directly within the safe callback
      view.widgetState = sortedVisibleWidgets.map(widget => serializeWidgetState(/** @type {HTMLElement} */(widget)))
    })

    logger.info(`Saved widget state for view: ${viewId} in board: ${boardId}`)
  } catch (error) {
    logger.error('Error saving widget state:', error)
  }
}
