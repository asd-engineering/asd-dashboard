// @ts-check
/**
 * Board and view management utilities.
 *
 * @module boardManagement
 */
import { saveBoardState, loadBoardState } from '../../storage/localStorage.js'
import { addWidget, updateWidgetOrders } from '../widget/widgetManagement.js'
import { widgetStore } from '../widget/widgetStore.js'
import { Logger } from '../../utils/Logger.js'
import { boardGetUUID, viewGetUUID } from '../../utils/id.js'

/** @typedef {import('../../types.js').Board} Board */
/** @typedef {import('../../types.js').View} View */
/** @typedef {import('../../types.js').Widget} Widget */

const logger = new Logger('boardManagement.js')

/** @type {Array<Board>} */
export let boards = []

/**
 * Create a board with a default view.
 * Updates DOM selectors and persists the state in localStorage.
 *
 * @param {string} boardName - Display name for the board.
 * @param {?string} [boardId=null] - Existing board identifier, if any.
 * @param {?string} [viewId=null] - Identifier for the default view.
 * @function createBoard
 * @returns {Board} The created board.
 */
export function createBoard (boardName, boardId = null, viewId = null) {
  const newBoardId = boardId || boardGetUUID()
  const newBoard = {
    id: newBoardId,
    name: boardName,
    order: boards.length,
    views: []
  }
  boards.push(newBoard)

  const defaultViewId = viewId || viewGetUUID()
  createView(newBoardId, 'Default View', defaultViewId)
  logger.log(`Created default view ${defaultViewId} for new board ${newBoardId}`)

  // Save the board state after creating the default view
  saveBoardState(boards)

  // Update the board selector
  updateBoardSelector()

  // Switch to the new board
  switchBoard(newBoardId, defaultViewId)
  logger.log(`Switched to new board ${newBoardId}`)

  // Save the current board and view in localStorage
  localStorage.setItem('lastUsedBoardId', newBoardId)
  localStorage.setItem('lastUsedViewId', defaultViewId)
  logger.log(`Saved last used boardId: ${newBoardId} and viewId: ${defaultViewId} to localStorage`)

  return newBoard
}

/**
 * Add a new view to an existing board and make it active.
 * The board state is persisted in localStorage and DOM selectors are updated.
 *
 * @param {string} boardId - Identifier of the board to modify.
 * @param {string} viewName - Display name for the view.
 * @param {?string} [viewId=null] - Optional predefined id for the view.
 * @function createView
 * @returns {View|undefined} The created view or undefined if the board is not found.
 */
export function createView (boardId, viewName, viewId = null) {
  const board = boards.find(b => b.id === boardId)
  if (board) {
    const newViewId = viewId || viewGetUUID()
    const newView = {
      id: newViewId,
      name: viewName,
      widgetState: []
    }
    board.views.push(newView)
    saveBoardState(boards)
    logger.log('Created new view:', newView)

    // Update the view selector
    updateViewSelector(boardId)

    // Switch to the new view
    switchView(boardId, newViewId)
    logger.log(`Switched to new view ${newViewId} in board ${boardId}`)

    // Save the current view in localStorage
    localStorage.setItem('lastUsedViewId', newViewId)
    logger.log(`Saved last used viewId: ${newViewId} to localStorage`)

    return newView
  } else {
    logger.error(`Board with ID ${boardId} not found`)
  }
}

function clearWidgetContainer () {
  const widgetContainer = document.getElementById('widget-container')
  while (widgetContainer.firstChild) {
    widgetContainer.removeChild(widgetContainer.firstChild)
  }
}

/**
 * Switch the currently active view within a board.
 * Clears and repopulates the widget container and updates localStorage.
 *
 * @param {string} boardId - Identifier of the board containing the view.
 * @param {string} viewId - Identifier of the view to activate.
 * @function switchView
 * @returns {Promise<void>} Resolves when widgets are loaded.
 */
export async function switchView (boardId, viewId) {
  const board = boards.find(b => b.id === boardId)
  const view = board?.views.find(v => v.id === viewId)
  if (!view) return logger.warn(`Invalid view ${viewId} on board ${boardId}`)

  document.querySelector('.board-view').id = viewId

  const activeIds = new Set(view.widgetState.map(w => w.dataid))

  for (const id of widgetStore.widgets.keys()) {
    if (!activeIds.has(id)) {
      widgetStore.hide(id)
    }
  }

  for (const widget of view.widgetState) {
    if (widgetStore.has(widget.dataid)) {
      widgetStore.show(widget.dataid)
    } else {
      await addWidget(
        widget.url,
        Number(widget.columns),
        Number(widget.rows),
        widget.type,
        boardId,
        viewId,
        widget.dataid
      )
    }
  }

  window.asd.currentViewId = viewId
  localStorage.setItem('lastUsedViewId', viewId)
  updateViewSelector(boardId)
  updateWidgetOrders(view.widgetState)
}

/**
 * Populate the view selector dropdown for a given board.
 * Reads the last used view from localStorage to preselect it.
 *
 * @param {string} boardId - Identifier of the board whose views will be shown.
 * @function updateViewSelector
 * @returns {void}
 */
export function updateViewSelector (boardId) {
  const viewSelector = /** @type {HTMLSelectElement} */(document.getElementById('view-selector'))
  if (!viewSelector) {
    logger.error('View selector element not found')
    return
  }

  viewSelector.innerHTML = '' // Clear existing options
  const board = boards.find(b => b.id === boardId)

  if (board) {
    logger.log(`Found board with ID: ${boardId}, adding its views to the selector`)
    board.views.forEach(view => {
      logger.log(`Adding view to selector: ${view.name} with ID: ${view.id}`)
      const option = document.createElement('option')
      option.value = view.id
      option.textContent = view.name
      viewSelector.appendChild(option)
    })

    // Select the newly created or switched view
    const lastUsedViewId = localStorage.getItem('lastUsedViewId')
    if (lastUsedViewId) {
      viewSelector.value = lastUsedViewId
      logger.log(`Set view selector value to last used viewId: ${lastUsedViewId}`)
    } else {
      logger.log('No last used viewId found in localStorage')
    }
  } else {
    logger.error(`Board with ID ${boardId} not found`)
  }
}

/**
 * Switch the current board and optionally a specific view.
 * Updates DOM identifiers and remembers the selection in localStorage.
 *
 * @param {string} boardId - Identifier of the board to activate.
 * @param {?string} [viewId=null] - Specific view id to load, defaults to first view.
 * @function switchBoard
 * @returns {Promise<void>} Resolves when the view is switched.
 */
export async function switchBoard (boardId, viewId = null) {
  logger.log(`Attempting to switch to board: ${boardId}`)
  const board = boards.find(b => b.id === boardId)
  if (board) {
    document.querySelector('.board').id = boardId
    const targetViewId = viewId || board.views[0].id

    await switchView(boardId, targetViewId)

    window.asd.currentBoardId = boardId
    window.asd.currentViewId = targetViewId
    localStorage.setItem('lastUsedBoardId', boardId)
    localStorage.setItem('lastUsedViewId', targetViewId)
    updateViewSelector(boardId)
  } else {
    logger.error(`Board with ID ${boardId} not found`)
  }
}

/**
 * Load boards from localStorage and populate the selectors.
 * Creates a default board when none exist and returns the first board/view.
 *
 * @function initializeBoards
 * @returns {Promise<{boardId: string, viewId: string}|undefined>} Resolves with the first board and view identifiers.
 */
export function initializeBoards () {
  return loadBoardState().then(loadedBoards => {
    boards = loadedBoards || []

    if (!Array.isArray(boards)) {
      boards = []
    }

    if (boards.length === 0) {
      createBoard('Default Board')
    }

    boards.forEach(board => {
      logger.log('Initializing board:', board)
      addBoardToUI(board)
    })

    if (boards.length > 0) {
      const firstBoard = boards[0]
      const firstView = firstBoard.views.length > 0 ? firstBoard.views[0] : { id: '' }
      return { boardId: firstBoard.id, viewId: firstView.id }
    }
    return { boardId: '', viewId: '' }
  }).catch(error => {
    logger.error('Error initializing boards:', error)
    return { boardId: '', viewId: '' }
  })
}

/**
 * Insert a board option into the board selector element.
 * Also selects the board stored in localStorage if available.
 *
 * @param {{id: string, name: string}} board - Board information to display.
 * @function addBoardToUI
 * @returns {void}
 */
export function addBoardToUI (board) {
  const boardSelector = /** @type {HTMLSelectElement} */(document.getElementById('board-selector'))
  const option = document.createElement('option')
  option.value = board.id
  option.textContent = board.name
  boardSelector.appendChild(option)

  // Select the newly created or switched board
  const lastUsedBoardId = localStorage.getItem('lastUsedBoardId')
  if (lastUsedBoardId) {
    boardSelector.value = lastUsedBoardId
  }
}

/**
 * Rename an existing board and persist the change.
 *
 * @param {string} boardId - Identifier of the board to rename.
 * @param {string} newBoardName - New name displayed to the user.
 * @function renameBoard
 * @returns {void}
 */
export function renameBoard (boardId, newBoardName) {
  const board = boards.find(b => b.id === boardId)
  if (board) {
    board.name = newBoardName
    saveBoardState(boards)
    logger.log(`Renamed board ${boardId} to ${newBoardName}`)
    updateBoardSelector()
  } else {
    logger.error(`Board with ID ${boardId} not found`)
  }
}

/**
 * Remove a board from the application and update the UI.
 * The remaining boards are saved back to localStorage.
 *
 * @param {string} boardId - Identifier of the board to delete.
 * @function deleteBoard
 * @returns {void}
 */
export function deleteBoard (boardId) {
  const boardIndex = boards.findIndex(b => b.id === boardId)
  if (boardIndex !== -1) {
    boards.splice(boardIndex, 1)
    saveBoardState(boards)
    logger.log(`Deleted board ${boardId}`)
    updateBoardSelector()
    if (boards.length > 0) {
      const firstBoardId = boards[0].id
      switchBoard(firstBoardId)
    } else {
      clearWidgetContainer()
      document.querySelector('.board').id = ''
      document.querySelector('.board-view').id = ''
    }
  } else {
    logger.error(`Board with ID ${boardId} not found`)
  }
}

/**
 * Rename a view within a board and persist the update.
 *
 * @param {string} boardId - Board containing the view.
 * @param {string} viewId - Identifier of the view to rename.
 * @param {string} newViewName - The new display name.
 * @function renameView
 * @returns {void}
 */
export function renameView (boardId, viewId, newViewName) {
  const board = boards.find(b => b.id === boardId)
  if (board) {
    const view = board.views.find(v => v.id === viewId)
    if (view) {
      view.name = newViewName
      saveBoardState(boards)
      logger.log(`Renamed view ${viewId} to ${newViewName}`)
      updateViewSelector(boardId)
    } else {
      logger.error(`View with ID ${viewId} not found`)
    }
  } else {
    logger.error(`Board with ID ${boardId} not found`)
  }
}

/**
 * Delete a view from a board, updating the DOM and stored state.
 *
 * @param {string} boardId - Identifier of the board containing the view.
 * @param {string} viewId - Identifier of the view to remove.
 * @function deleteView
 * @returns {void}
 */
export function deleteView (boardId, viewId) {
  const board = boards.find(b => b.id === boardId)
  if (board) {
    const viewIndex = board.views.findIndex(v => v.id === viewId)
    if (viewIndex !== -1) {
      const viewToDelete = board.views[viewIndex]

      if (viewToDelete.widgetState) {
        viewToDelete.widgetState.forEach(widget => {
          if (widget.dataid) {
            widgetStore.requestRemoval(widget.dataid)
          }
        })
      }

      board.views.splice(viewIndex, 1)
      saveBoardState(boards)
      logger.log(`Deleted view ${viewId} and evicted its widgets.`)
      updateViewSelector(boardId)
      if (board.views.length > 0) {
        const nextIndex = Math.max(0, viewIndex - 1)
        const nextViewId = board.views[nextIndex].id
        switchView(boardId, nextViewId)
        const viewSelector = document.getElementById('view-selector')
        if (viewSelector) viewSelector.value = nextViewId
      } else {
        createView(boardId, 'Default View')
      }
    } else {
      logger.error(`View with ID ${viewId} not found`)
    }
  } else {
    logger.error(`Board with ID ${boardId} not found`)
  }
}

/**
 * Clear all widgets from a view and persist the empty state.
 *
 * @param {string} boardId - Identifier of the board containing the view.
 * @param {string} viewId - Identifier of the view to reset.
 * @function resetView
 * @returns {void}
 */
export function resetView (boardId, viewId) {
  const board = boards.find(b => b.id === boardId)
  if (board) {
    const view = board.views.find(v => v.id === viewId)
    if (view) {
      view.widgetState.forEach(widget => {
        if (widget.dataid) {
          widgetStore.requestRemoval(widget.dataid)
        }
      })

      view.widgetState = []
      saveBoardState(boards)
      logger.log(`Reset view ${viewId} and evicted its widgets.`)
    } else {
      logger.error(`View with ID ${viewId} not found`)
    }
  } else {
    logger.error(`Board with ID ${boardId} not found`)
  }
}

function updateBoardSelector () {
  const boardSelector = /** @type {HTMLSelectElement} */(document.getElementById('board-selector'))
  boardSelector.innerHTML = ''
  boards.forEach(board => {
    const option = document.createElement('option')
    option.value = board.id
    option.textContent = board.name
    boardSelector.appendChild(option)
  })

  // Select the newly created or switched board
  const lastUsedBoardId = localStorage.getItem('lastUsedBoardId')
  if (lastUsedBoardId) {
    boardSelector.value = lastUsedBoardId
  }
}
