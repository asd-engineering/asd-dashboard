// @ts-check
/**
 * Board and view management utilities.
 *
 * @module boardManagement
 */
import { addWidget } from '../widget/widgetManagement.js'
import { widgetStore } from '../widget/widgetStore.js'
import { Logger } from '../../utils/Logger.js'
import { boardGetUUID, viewGetUUID } from '../../utils/id.js'
import StorageManager from '../../storage/StorageManager.js'
import { getCurrentBoardId, getCurrentViewId } from '../../utils/elements.js'
import { saveWidgetState } from '../../storage/widgetStatePersister.js'

/** @typedef {import('../../types.js').Board} Board */
/** @typedef {import('../../types.js').View} View */
/** @typedef {import('../../types.js').Widget} Widget */

const logger = new Logger('boardManagement.js')

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
  const defaultViewId = viewId || viewGetUUID()

  // Persist last used ids before dispatching the config update
  StorageManager.misc.setLastBoardId(newBoardId)
  StorageManager.misc.setLastViewId(defaultViewId)

  StorageManager.updateBoards(boards => {
    const newBoard = {
      id: newBoardId,
      name: boardName,
      order: boards.length,
      views: [
        {
          id: defaultViewId,
          name: 'Default View',
          widgetState: []
        }
      ]
    }
    boards.push(newBoard)
  })

  logger.log(`Created default view ${defaultViewId} for new board ${newBoardId}`)

  // Switch to the new board
  await switchBoard(newBoardId, defaultViewId)
  logger.log(`Switched to new board ${newBoardId}`)

  return StorageManager.getBoards().find(b => b.id === newBoardId)
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
  /** @type {View|undefined} */
  let created
  const newViewId = viewId || viewGetUUID()

  StorageManager.misc.setLastViewId(newViewId)

  StorageManager.updateBoards(boards => {
    const board = boards.find(b => b.id === boardId)
    if (!board) return
    const newView = { id: newViewId, name: viewName, widgetState: [] }
    board.views.push(newView)
    created = newView
  })

  if (!created) {
    logger.error(`Board with ID ${boardId} not found`)
    return undefined
  }

  logger.log('Created new view:', created)

  await switchView(boardId, created.id)
  logger.log(`Switched to new view ${created.id} in board ${boardId}`)

  return created
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
export async function switchView (boardId = getCurrentBoardId(), viewId) {
  const oldViewId = getCurrentViewId()

  // Save the state of the view we are leaving, but only if it's different.
  if (oldViewId && oldViewId !== viewId) {
    saveWidgetState(boardId, oldViewId)
  }

  const board = StorageManager.getBoards().find(b => b.id === boardId)
  const view = board?.views.find(v => v.id === viewId)
  if (!view) return logger.warn(`Invalid view ${viewId} on board ${boardId}`)

  document.querySelector('.board-view').id = viewId

  const activeIds = new Set(view.widgetState.map(w => w.dataid))

  for (const id of widgetStore.widgets.keys()) {
    if (!activeIds.has(id)) {
      widgetStore.hide(id)
    }
  }

  const missing = view.widgetState.filter(w => !widgetStore.has(w.dataid))
  const proceed = await widgetStore.confirmCapacity(missing.length)
  if (!proceed) return

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
        widget.dataid,
        { skipCapacity: true }
      )
    }
  }

  StorageManager.misc.setLastViewId(viewId)
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
  const board = StorageManager.getBoards().find(b => b.id === boardId)
  const viewButtonMenu = document.getElementById('view-button-menu')
  const settings = StorageManager.getConfig()?.globalSettings || {}

  if (viewButtonMenu && settings.views?.showViewOptionsAsButtons) {
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

      if (viewButtonMenu && settings.views?.showViewOptionsAsButtons) {
        const btn = document.createElement('button')
        btn.textContent = view.name
        btn.dataset.viewId = view.id
        if (view.id === getCurrentViewId()) btn.classList.add('active')

        btn.addEventListener('click', async () => {
          try {
            await switchView(boardId, view.id)
          } catch (error) {
            logger.error('Error switching view:', error)
          }
        })
        viewButtonMenu.appendChild(btn)
      }
    })

    // Select the newly created or switched view
    const lastUsedViewId = StorageManager.misc.getLastViewId()
    if (lastUsedViewId) {
      viewSelector.value = lastUsedViewId
      logger.log(`Set view selector value to last used viewId: ${lastUsedViewId}`)
    } else {
      logger.log('No last used viewId found in storage')
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
  const board = StorageManager.getBoards().find(b => b.id === boardId)
  if (board) {
    document.querySelector('.board').id = boardId
    const settings = StorageManager.getConfig()?.globalSettings || {}
    const preferred = settings.views?.viewToShow
    const targetViewId = viewId ||
      (preferred && board.views.some(v => v.id === preferred)
        ? preferred
        : (board.views.length > 0 ? board.views[0].id : null))

    if (targetViewId) {
      await switchView(boardId, targetViewId)
    } else {
      // Handle board with no views
      clearWidgetContainer()
      document.querySelector('.board-view').id = ''
      StorageManager.misc.setLastViewId(null)
    }

    // Persist and sync UI/counters using main's model + feature counter
    StorageManager.misc.setLastBoardId(boardId)
    updateViewSelector(boardId)
    document.dispatchEvent(new CustomEvent('state-change', { detail: { reason: 'services' } }))
    document.dispatchEvent(new Event('view:ready'))
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
  return (async () => {
    let boards = StorageManager.getBoards()

    if (!Array.isArray(boards)) {
      boards = []
    }

    if (boards.length === 0) {
      await createBoard('Default Board')
      boards = StorageManager.getBoards()
    }

    boards.forEach(board => {
      logger.log('Initializing board:', board)
      addBoardToUI(board)
    })

    if (boards.length > 0) {
      const firstBoard = boards[0]
      let firstView = firstBoard.views.length > 0 ? firstBoard.views[0] : { id: '' }
      const settings = StorageManager.getConfig()?.globalSettings || {}
      const preferred = settings.views?.viewToShow
      if (preferred) {
        const candidate = firstBoard.views.find(v => v.id === preferred)
        if (candidate) firstView = candidate
      }
      return { boardId: firstBoard.id, viewId: firstView.id }
    } else {
      return { boardId: '', viewId: '' }
    }
  })().catch(error => {
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
  const lastUsedBoardId = StorageManager.misc.getLastBoardId()
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
  let found = false
  StorageManager.updateBoards(boards => {
    const board = boards.find(b => b.id === boardId)
    if (board) {
      board.name = newBoardName
      found = true
    }
  })

  if (found) {
    logger.log(`Renamed board ${boardId} to ${newBoardName}`)
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
  let removed = false
  StorageManager.updateBoards(boards => {
    const idx = boards.findIndex(b => b.id === boardId)
    if (idx !== -1) {
      boards.splice(idx, 1)
      removed = true
    }
  })

  if (removed) {
    logger.log(`Deleted board ${boardId}`)
    const boards = StorageManager.getBoards()
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
  let boardFound = false
  let viewFound = false
  StorageManager.updateBoards(boards => {
    const board = boards.find(b => b.id === boardId)
    if (!board) return
    boardFound = true
    const view = board.views.find(v => v.id === viewId)
    if (view) {
      view.name = newViewName
      viewFound = true
    }
  })

  if (!boardFound) {
    return logger.error(`Board with ID ${boardId} not found`)
  }
  if (!viewFound) {
    return logger.error(`View with ID ${viewId} not found`)
  }

  logger.log(`Renamed view ${viewId} to ${newViewName}`)
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
  let boardFound = false
  let viewRemoved = false
  const removeIds = []
  StorageManager.updateBoards(boards => {
    const board = boards.find(b => b.id === boardId)
    if (!board) return
    boardFound = true
    const idx = board.views.findIndex(v => v.id === viewId)
    if (idx === -1) return
    const viewToDelete = board.views[idx]
    if (Array.isArray(viewToDelete.widgetState)) {
      viewToDelete.widgetState.forEach(w => { if (w.dataid) removeIds.push(w.dataid) })
    }
    board.views.splice(idx, 1)
    viewRemoved = true
  })

  if (!boardFound) {
    return logger.error(`Board with ID ${boardId} not found`)
  }
  if (!viewRemoved) {
    return logger.error(`View with ID ${viewId} not found`)
  }

  for (const id of removeIds) {
    await widgetStore.requestRemoval(id)
  }

  logger.log(`Deleted view ${viewId} and evicted its widgets.`)

  const board = StorageManager.getBoards().find(b => b.id === boardId)
  if (board && board.views.length > 0) {
    const nextViewId = board.views[0].id
    await switchView(boardId, nextViewId)
    const viewSelector = /** @type {HTMLSelectElement} */(document.getElementById('view-selector'))
    if (viewSelector) viewSelector.value = nextViewId
  } else {
    clearWidgetContainer()
    const viewSelector = /** @type {HTMLSelectElement} */(document.getElementById('view-selector'))
    if (viewSelector) viewSelector.innerHTML = ''
    document.querySelector('.board-view').id = ''
    StorageManager.misc.setLastViewId(null)
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
  const idsToRemove = []
  let boardFound = false
  let viewFound = false

  StorageManager.updateBoards(boards => {
    const board = boards.find(b => b.id === boardId)
    if (!board) return
    boardFound = true
    const view = board.views.find(v => v.id === viewId)
    if (!view) return
    viewFound = true
    if (Array.isArray(view.widgetState)) {
      view.widgetState.forEach(w => { if (w.dataid) idsToRemove.push(w.dataid) })
    }
    view.widgetState = []
  })

  if (!boardFound) return logger.error(`Board with ID ${boardId} not found`)
  if (!viewFound) return logger.error(`View with ID ${viewId} not found`)

  for (const id of idsToRemove) {
    await widgetStore.requestRemoval(id)
  }

  logger.log(`Reset view ${viewId} and evicted its widgets.`)
}

/**
 * Reset all views within a board by clearing their widget state.
 *
 * @param {string} boardId - Identifier of the board to reset.
 * @function resetBoard
 * @returns {Promise<void>}
 */
export async function resetBoard (boardId) {
  const board = StorageManager.getBoards().find(b => b.id === boardId)
  if (!board) return logger.error(`Board with ID ${boardId} not found`)
  for (const v of board.views) {
    await resetView(boardId, v.id)
  }
  logger.log(`Reset board ${boardId}`)
}

/**
 * Rebuilds the board selector dropdown from the in-memory `boards` array.
 * @function updateBoardSelector
 * @returns {void}
 */
export function updateBoardSelector () {
  const boardSelector = /** @type {HTMLSelectElement} */(document.getElementById('board-selector'))
  boardSelector.innerHTML = ''
  StorageManager.getBoards().forEach(board => {
    const option = document.createElement('option')
    option.value = board.id
    option.textContent = board.name
    boardSelector.appendChild(option)
  })

  // Select the newly created or switched board
  const lastUsedBoardId = StorageManager.misc.getLastBoardId()
  if (lastUsedBoardId) {
    boardSelector.value = lastUsedBoardId
  }
}
