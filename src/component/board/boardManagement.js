// @ts-check
/**
 * Board and view management utilities.
 *
 * @module boardManagement
 */
import { saveBoardState, loadBoardState } from '../../storage/localStorage.js'
import { addWidget } from '../widget/widgetManagement.js'
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
 * @returns {Promise<Board>} The created board.
 */
export async function createBoard (boardName, boardId = null, viewId = null) {
  const newBoardId = boardId || boardGetUUID()
  const newBoard = {
    id: newBoardId,
    name: boardName,
    order: boards.length,
    views: []
  }
  boards.push(newBoard)

  const defaultViewId = viewId || viewGetUUID()
  await createView(newBoardId, 'Default View', defaultViewId)
  logger.log(`Created default view ${defaultViewId} for new board ${newBoardId}`)

  // Save the board state after creating the default view
  await saveBoardState(boards)

  // Update the board selector
  updateBoardSelector()

  // Switch to the new board
  await switchBoard(newBoardId, defaultViewId)
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
 * @returns {Promise<View|undefined>} The created view or undefined if the board is not found.
 */
export async function createView (boardId, viewName, viewId = null) {
  const board = boards.find(b => b.id === boardId)
  if (board) {
    const newViewId = viewId || viewGetUUID()
    const newView = {
      id: newViewId,
      name: viewName,
      widgetState: []
    }
    board.views.push(newView)
    await saveBoardState(boards)
    logger.log('Created new view:', newView)

    // Update the view selector
    updateViewSelector(boardId)

    // Switch to the new view
    await switchView(boardId, newViewId)
    logger.log(`Switched to new view ${newViewId} in board ${boardId}`)

    // Save the current view in localStorage
    localStorage.setItem('lastUsedViewId', newViewId)
    logger.log(`Saved last used viewId: ${newViewId} to localStorage`)

    return newView
  } else {
    logger.error(`Board with ID ${boardId} not found`)
  }
}

/**
 * Hides all widgets currently managed by the widgetStore.
 * This is used to clear the view without removing elements from the DOM permanently.
 * @function clearWidgetContainer
 * @returns {void}
 */
function clearWidgetContainer () {
  // Hide all widgets in the store instead of removing from DOM
  for (const id of widgetStore.widgets.keys()) {
    widgetStore.hide(id)
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
  const viewButtonMenu = document.getElementById('view-button-menu')
  const settings = window.asd.config?.globalSettings || {}
  if (viewButtonMenu && settings.showViewOptionsAsButtons) {
    viewButtonMenu.innerHTML = ''
  }

  if (board) {
    logger.log(`Found board with ID: ${boardId}, adding its views to the selector`)
    board.views.forEach(view => {
      logger.log(`Adding view to selector: ${view.name} with ID: ${view.id}`)
      const option = document.createElement('option')
      option.value = view.id
      option.textContent = view.name
      viewSelector.appendChild(option)
      if (viewButtonMenu && settings.showViewOptionsAsButtons) {
        const btn = document.createElement('button')
        btn.textContent = view.name
        btn.dataset.viewId = view.id
        btn.addEventListener('click', () => {
          switchView(boardId, view.id)
        })
        viewButtonMenu.appendChild(btn)
      }
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
    const targetViewId = viewId || (board.views.length > 0 ? board.views[0].id : null)

    if (targetViewId) {
      await switchView(boardId, targetViewId)
    } else {
      // Handle board with no views
      clearWidgetContainer()
      document.querySelector('.board-view').id = ''
      window.asd.currentViewId = null
      localStorage.removeItem('lastUsedViewId')
    }

    window.asd.currentBoardId = boardId
    localStorage.setItem('lastUsedBoardId', boardId)
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
  return loadBoardState().then(async loadedBoards => {
    boards = loadedBoards || []

    if (!Array.isArray(boards)) {
      boards = []
    }

    if (boards.length === 0) {
      // createBoard is async now
      await createBoard('Default Board')
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
 * @returns {Promise<void>}
 */
export async function renameBoard (boardId, newBoardName) {
  const board = boards.find(b => b.id === boardId)
  if (board) {
    board.name = newBoardName
    await saveBoardState(boards)
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
 * @returns {Promise<void>}
 */
export async function deleteBoard (boardId) {
  const boardIndex = boards.findIndex(b => b.id === boardId)
  if (boardIndex !== -1) {
    boards.splice(boardIndex, 1)
    await saveBoardState(boards)
    logger.log(`Deleted board ${boardId}`)
    updateBoardSelector()
    if (boards.length > 0) {
      const firstBoardId = boards[0].id
      await switchBoard(firstBoardId)
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
 * @returns {Promise<void>}
 */
export async function renameView (boardId, viewId, newViewName) {
  const board = boards.find(b => b.id === boardId)
  if (board) {
    const view = board.views.find(v => v.id === viewId)
    if (view) {
      view.name = newViewName
      await saveBoardState(boards)
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
 * @returns {Promise<void>}
 */
export async function deleteView (boardId, viewId) {
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
      await saveBoardState(boards)
      logger.log(`Deleted view ${viewId} and evicted its widgets.`)

      updateViewSelector(boardId)

      if (board.views.length > 0) {
        const nextViewId = board.views[0].id
        await switchView(boardId, nextViewId)
        const viewSelector = /** @type {HTMLSelectElement} */(document.getElementById('view-selector'))
        if (viewSelector) viewSelector.value = nextViewId
      } else {
        clearWidgetContainer()
        const viewSelector = /** @type {HTMLSelectElement} */(document.getElementById('view-selector'))
        if (viewSelector) viewSelector.innerHTML = ''
        document.querySelector('.board-view').id = ''
        window.asd.currentViewId = null
        localStorage.removeItem('lastUsedViewId')
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
 * @returns {Promise<void>}
 */
export async function resetView (boardId, viewId) {
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
      await saveBoardState(boards)
      logger.log(`Reset view ${viewId} and evicted its widgets.`)
    } else {
      logger.error(`View with ID ${viewId} not found`)
    }
  } else {
    logger.error(`Board with ID ${boardId} not found`)
  }
}

/**
 * Rebuilds the board selector dropdown from the in-memory `boards` array.
 * @function updateBoardSelector
 * @returns {void}
 */
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
