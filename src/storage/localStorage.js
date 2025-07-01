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
 * Convert a widget DOM element to a serializable state object.
 * @param {HTMLElement} widget
 * @returns {Widget}
 */
function serializeWidgetState (widget) {
  let metadata = {}
  if (widget.dataset.metadata) {
    try {
      metadata = JSON.parse(widget.dataset.metadata)
    } catch (error) {
      logger.error('Error parsing metadata:', error)
      metadata = {}
    }
  }

  let settings = {}
  if (widget.dataset.settings) {
    try {
      settings = JSON.parse(widget.dataset.settings)
    } catch (error) {
      logger.error('Error parsing settings:', error)
      settings = {}
    }
  }

  const state = {
    dataid: widget.dataset.dataid,
    order: widget.getAttribute('data-order'),
    url: widget.querySelector('iframe').src,
    columns: widget.dataset.columns || 1,
    rows: widget.dataset.rows || 1,
    type: widget.dataset.type || 'iframe',
    metadata,
    settings
  }
  logger.info('Saving widget state:', state)
  return state
}

/**
 * Serialize widgets in the current view and store them under the given board
 * and view identifiers in localStorage. Each widget is saved with its order,
 * dimensions, URL and any metadata/settings.
 *
 * @param {string} boardId - Board identifier. Defaults to the current board element id.
 * @param {string} viewId - View identifier. Defaults to the current view element id.
 * @function saveWidgetState
 * @returns {Promise<void>}
 */
async function saveWidgetState (boardId, viewId) {
  if (!boardId || !viewId) {
    return logger.error('Board ID or View ID is missing. Cannot save widget state.')
  }

  try {
    const boards = await loadBoardState()
    const board = boards.find(b => b.id === boardId)
    if (!board) return logger.error(`Board not found for saving state: ${boardId}`)

    const view = board.views.find(v => v.id === viewId)
    if (!view) return logger.error(`View not found for saving state: ${viewId}`)

    const updatedWidgetState = view.widgetState
      .map(widgetData => {
        const widgetElement = window.asd.widgetStore.get(widgetData.dataid)
        if (widgetElement) {
          return serializeWidgetState(widgetElement)
        }
        return widgetData
      })
      .filter(Boolean)

    view.widgetState = updatedWidgetState

    await saveBoardState(boards)
    logger.info(`Saved widget state for view: ${viewId} in board: ${boardId}`)
  } catch (error) {
    logger.error('Error saving widget state:', error)
  }
}

/**
 * Restore widget DOM elements for the specified board and view from
 * localStorage. Widgets are recreated using {@link createWidget} and metadata
 * and settings are re-applied.
 *
 * @param {string} boardId - Board identifier.
 * @param {string} viewId - View identifier whose widgets should be loaded.
 * @function loadWidgetState
 * @returns {Promise<void>}
 */
async function loadWidgetState (boardId, viewId) {
  // This logic is now handled by switchView. Kept for backward compatibility.
  logger.warn('loadWidgetState is deprecated; view switching now handles widget loading.')
}

/**
 * Store the initial board configuration defined in {@code window.asd.config}
 * into localStorage. This is typically called on first run to seed the
 * persistent board data.
 *
 * @function loadInitialConfig
 * @returns {Promise<void>}
 */
async function loadInitialConfig () {
  try {
    const boards = window.asd.config.boards
    if (boards.length > 0) {
      await saveBoardState(boards)
    }
  } catch (error) {
    logger.error('Error loading initial configuration:', error)
  }
}

/**
 * Persist the entire boards array to localStorage under the key `boards`.
 *
 * @function saveBoardState
 * @param {Array<Board>} boards - Array of board objects to store.
 * @returns {Promise<void>}
 */
async function saveBoardState (boards) {
  try {
    localStorage.setItem('boards', JSON.stringify(boards))
    logger.log('Saved board state to localStorage')
  } catch (error) {
    logger.error('Error saving board state:', error)
  }
}

/**
 * Retrieve the array of boards from localStorage.
 * The result is also assigned to {@code window.asd.boards} for global access.
 *
 * @function loadBoardState
 * @returns {Promise<Array<Board>>} Parsed array of boards or an empty array on failure.
 */
async function loadBoardState () {
  try {
    const boards = localStorage.getItem('boards')
    const parsedBoards = boards ? JSON.parse(boards) : []

    if (parsedBoards) {
      window.asd.boards = parsedBoards
    }
    logger.log('Loaded board state from localStorage:', parsedBoards)
    return parsedBoards
  } catch (error) {
    logger.error('Error loading board state:', error)
    return []
  }
}

export { saveWidgetState, loadWidgetState, loadInitialConfig, saveBoardState, loadBoardState }
