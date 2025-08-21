// @ts-check
/**
 * Thin adapter mapping selector panel actions to existing handlers.
 * @module panel/adapter
 */
import { StorageManager } from '../../storage/StorageManager.js'
import { getCurrentBoardId as domBoardId, getCurrentViewId as domViewId } from '../../utils/elements.js'
import {
  switchBoard,
  switchView,
  createBoard,
  renameBoard,
  deleteBoard,
  createView,
  renameView,
  deleteView,
  resetView
} from '../board/boardManagement.js'

/**
 * Get all persisted boards.
 * @returns {import('../../types.js').Board[]}
 */
export function getBoards () {
  return StorageManager.getBoards() || []
}

/**
 * Get identifier of the current board.
 * @returns {string}
 */
export function getCurrentBoardId () {
  return domBoardId()
}

/**
 * Get identifier of the current view.
 * @returns {string}
 */
export function getCurrentViewId () {
  return domViewId()
}

export { switchBoard, switchView }

/**
 * Handle board side actions.
 * @param {string} action
 * @param {{boardId?:string}} [ctx]
 */
export async function handleBoardAction (action, ctx = {}) {
  const boardId = ctx.boardId || getCurrentBoardId()
  if (action === 'create') {
    const name = prompt('Enter new board name:')
    if (name) await createBoard(name)
    return
  }
  if (action === 'rename') {
    const name = prompt('Enter new board name:')
    if (name) await renameBoard(boardId, name)
    return
  }
  if (action === 'delete') {
    if (confirm('Are you sure you want to delete this board?')) {
      await deleteBoard(boardId)
    }
  }
}

/**
 * Handle view side actions.
 * @param {string} action
 * @param {{boardId?:string,viewId?:string}} [ctx]
 */
export async function handleViewAction (action, ctx = {}) {
  const boardId = ctx.boardId || getCurrentBoardId()
  const viewId = ctx.viewId || getCurrentViewId()
  if (action === 'create') {
    const name = prompt('Enter new view name:')
    if (name) await createView(boardId, name)
    return
  }
  if (action === 'rename') {
    const name = prompt('Enter new view name:')
    if (name) await renameView(boardId, viewId, name)
    return
  }
  if (action === 'delete') {
    if (confirm('Are you sure you want to delete this view?')) {
      await deleteView(boardId, viewId)
    }
    return
  }
  if (action === 'reset') {
    if (confirm('Are you sure you want to reset this view?')) {
      await resetView(boardId, viewId)
    }
  }
}
