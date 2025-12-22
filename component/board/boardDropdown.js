// @ts-check
/**
 * UI handlers for the board actions dropdown.
 *
 * @module boardDropdown
 */
import { createBoard, renameBoard, deleteBoard, updateViewSelector } from './boardManagement.js'
import { initializeDropdown } from '../utils/dropDownUtils.js'
import { Logger } from '../../utils/Logger.js'
import StorageManager from '../../storage/StorageManager.js'

const logger = new Logger('boardDropdown.js')

/**
 * Attach dropdown actions for board management.
 *
 * @function initializeBoardDropdown
 * @returns {void}
 */
export function initializeBoardDropdown () {
  const boardDropdown = document.getElementById('board-dropdown')
  logger.log('Board dropdown initialized:', boardDropdown)

  initializeDropdown(boardDropdown, {
    create: handleCreateBoard,
    rename: handleRenameBoard,
    delete: handleDeleteBoard
  })
}

/**
 * Prompt the user for a board name and create it.
 *
 * @function handleCreateBoard
 * @returns {Promise<void>}
 */
async function handleCreateBoard () {
  const boardName = prompt('Enter new board name:')
  if (boardName) {
    try {
      const newBoard = await createBoard(boardName)
      logger.log('Board created:', newBoard)
    } catch (error) {
      logger.error('Error creating board:', error)
    }
  }
}

/**
 * Prompt for a new name and rename the selected board.
 *
 * @function handleRenameBoard
 * @returns {Promise<void>}
 */
async function handleRenameBoard () {
  const boardId = getSelectedBoardId()
  const newBoardName = prompt('Enter new board name:')
  if (newBoardName) {
    try {
      await renameBoard(boardId, newBoardName)
      logger.log('Board renamed to:', newBoardName)
    } catch (error) {
      logger.error('Error renaming board:', error)
    }
  }
}

/**
 * Delete the currently selected board after confirmation.
 *
 * @function handleDeleteBoard
 * @returns {Promise<void>}
 */
async function handleDeleteBoard () {
  const boardId = getSelectedBoardId()
  if (confirm('Are you sure you want to delete this board?')) {
    try {
      await deleteBoard(boardId)
      logger.log('Board deleted:', boardId)
      const boards = StorageManager.getConfig().boards || []
      if (boards.length > 0) {
        updateViewSelector(boards[0].id)
      }
    } catch (error) {
      logger.error('Error deleting board:', error)
    }
  }
}

/**
 * Get the board id currently selected in the dropdown.
 *
 * @function getSelectedBoardId
 * @returns {string}
 */
function getSelectedBoardId () {
  const boardSelector = /** @type {HTMLSelectElement} */(document.getElementById('board-selector'))
  return boardSelector.value
}
