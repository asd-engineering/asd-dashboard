// @ts-check
/**
 * Utilities for persisting board and widget state in `localStorage`.
 *
 * @module localStorage
 */
import { Logger } from '../utils/Logger.js'

/** @typedef {import('../types.js').Widget} Widget */
/** @typedef {import('../types.js').Board} Board */

const logger = new Logger('localStorage.js')

/**
 * Converts a widget DOM element into a serializable state object.
 * @function serializeWidgetState
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

  const state = {
    dataid: widget.dataset.dataid,
    order: widget.getAttribute('data-order'),
    url: widget.querySelector('iframe').src,
    columns: widget.dataset.columns || '1',
    rows: widget.dataset.rows || '1',
    type: widget.dataset.type || 'iframe',
    metadata,
    settings
  }
  return state
}

/**
 * Serializes the state of all visible widgets and saves it to localStorage.
 * @function saveWidgetState
 * @param {string} boardId - The ID of the current board.
 * @param {string} viewId - The ID of the current view.
 * @returns {void}
 */
function saveWidgetState (boardId, viewId) {
  if (!boardId || !viewId) {
    return logger.error('Board ID or View ID is missing. Cannot save widget state.')
  }

  try {
    const boards = [...window.asd.boards] // Create a copy to avoid mutation issues
    const board = boards.find(b => b.id === boardId)
    if (!board) return logger.error(`Board not found for saving state: ${boardId}`)

    const view = board.views.find(v => v.id === viewId)
    if (!view) return logger.error(`View not found for saving state: ${viewId}`)

    const widgetContainer = document.getElementById('widget-container')
    const visibleWidgets = Array.from(widgetContainer.children)
      .filter(el => (el instanceof HTMLElement) && el.style.display !== 'none')

    // Sort widgets based on their `data-order` attribute, which is the source of truth after a swap.
    const sortedVisibleWidgets = visibleWidgets.sort((a, b) => {
      const orderA = parseInt(/** @type {HTMLElement} */(a).getAttribute('data-order') || '0', 10)
      const orderB = parseInt(/** @type {HTMLElement} */(b).getAttribute('data-order') || '0', 10)
      return orderA - orderB
    })

    // Re-normalize the order attribute before saving to ensure it is sequential.
    sortedVisibleWidgets.forEach((widget, index) => {
      (/** @type {HTMLElement} */(widget)).setAttribute('data-order', String(index))
      ;(/** @type {HTMLElement} */(widget)).style.order = String(index)
    })

    const updatedWidgetState = sortedVisibleWidgets.map(widget => serializeWidgetState(/** @type {HTMLElement} */(widget)))
    view.widgetState = updatedWidgetState

    saveBoardState(boards)
    document.dispatchEvent(new CustomEvent('widget-state-saved'))
    logger.info(`Saved widget state for view: ${viewId} in board: ${boardId}`)
  } catch (error) {
    logger.error('Error saving widget state:', error)
  }
}

/**
 * Loads the initial board configuration from the global config object into localStorage.
 * This is typically called on first run to seed the dashboard.
 * @function loadInitialConfig
 * @returns {Promise<void>}
 */
async function loadInitialConfig () {
  try {
    const boards = window.asd.config.boards
    if (boards && boards.length > 0) {
      saveBoardState(boards)
    }
  } catch (error) {
    logger.error('Error loading initial configuration:', error)
  }
}

/**
 * Persists the entire array of board objects to localStorage.
 * @function saveBoardState
 * @param {Array<import('../types.js').Board>} boards - The array of boards to save.
 * @returns {void}
 */
function saveBoardState (boards) {
  try {
    localStorage.setItem('boards', JSON.stringify(boards))
    window.asd.boards = boards // Keep global state synchronized
    logger.log('Saved board state to localStorage')
  } catch (error) {
    logger.error('Error saving board state:', error)
  }
}

/**
 * Retrieves the array of boards from localStorage.
 * @function loadBoardState
 * @returns {Promise<Array<import('../types.js').Board>>} A promise that resolves to the array of boards.
 */
async function loadBoardState () {
  try {
    const boardsJSON = localStorage.getItem('boards')
    const parsedBoards = boardsJSON ? JSON.parse(boardsJSON) : []
    window.asd.boards = parsedBoards
    return parsedBoards
  } catch (error) {
    logger.error('Error loading board state:', error)
    return []
  }
}

export { saveWidgetState, loadInitialConfig, saveBoardState, loadBoardState }
