import { saveBoardState } from '../../storage/localStorage.js'
import { createBoard, renameBoard, deleteBoard, updateViewSelector, addBoardToUI, boards, switchBoard, switchView } from './boardManagement.js'
import { initializeDropdown } from '../utils/dropDownUtils.js'
import { Logger } from '../../utils/Logger.js'

const logger = new Logger('boardDropdown.js')

export function initializeBoardDropdown () {
  const boardDropdown = document.getElementById('board-dropdown')
  logger.log('Board dropdown initialized:', boardDropdown)

  initializeDropdown(boardDropdown, {
    create: handleCreateBoard,
    rename: handleRenameBoard,
    delete: handleDeleteBoard
  })
}

async function handleCreateBoard () {
  const boardName = prompt('Enter new board name:')
  if (boardName) {
    try {
      const newBoard = createBoard(boardName)
      logger.log('Board created:', newBoard)
      saveBoardState(boards)
      addBoardToUI(newBoard)

      // Switch to the new board and its default view
      await switchBoard(newBoard.id)
      const defaultViewId = newBoard.views[0].id
      await switchView(newBoard.id, defaultViewId)

      // Save the current board and view in localStorage
      localStorage.setItem('lastUsedBoardId', newBoard.id)
      localStorage.setItem('lastUsedViewId', defaultViewId)
      logger.log(`Switched to new board ${newBoard.id} and view ${defaultViewId}`)
    } catch (error) {
      logger.error('Error creating board:', error)
    }
  }
}

function handleRenameBoard () {
  const boardId = getSelectedBoardId()
  const newBoardName = prompt('Enter new board name:')
  if (newBoardName) {
    try {
      renameBoard(boardId, newBoardName)
      logger.log('Board renamed to:', newBoardName)
      saveBoardState(boards)
    } catch (error) {
      logger.error('Error renaming board:', error)
    }
  }
}

function handleDeleteBoard () {
  const boardId = getSelectedBoardId()
  if (confirm('Are you sure you want to delete this board?')) {
    try {
      deleteBoard(boardId)
      logger.log('Board deleted:', boardId)
      saveBoardState(boards)
      if (boards.length > 0) {
        updateViewSelector(boards[0].id)
      }
    } catch (error) {
      logger.error('Error deleting board:', error)
    }
  }
}

function getSelectedBoardId () {
  const boardSelector = document.getElementById('board-selector')
  return boardSelector.value
}
