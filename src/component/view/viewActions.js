// @ts-check
/**
 * Action handlers for view-specific actions.
 *
 * @module viewActions
 */
import { createView, renameView, deleteView, resetView } from '../board/boardManagement.js'
import { getCurrentBoardId, getCurrentViewId } from '../../utils/elements.js'
import { Logger } from '../../utils/Logger.js'

const logger = new Logger('viewActions.js')

/**
 * Create a new view on the active board.
 *
 * @function handleCreateView
 * @returns {Promise<void>}
 */
export async function handleCreateView () {
  const boardId = getCurrentBoardId()
  const viewName = prompt('Enter new view name:')
  if (viewName) {
    try {
      const newView = await createView(boardId, viewName)
      if (newView) {
        logger.log('View created:', newView)
      }
    } catch (error) {
      logger.error('Error creating view:', error)
    }
  }
}

/**
 * Rename the currently selected view.
 *
 * @function handleRenameView
 * @returns {Promise<void>}
 */
export async function handleRenameView () {
  const boardId = getCurrentBoardId()
  const viewId = getCurrentViewId()
  const newViewName = prompt('Enter new view name:')
  if (newViewName) {
    try {
      await renameView(boardId, viewId, newViewName)
      logger.log('View renamed to:', newViewName)
    } catch (error) {
      logger.error('Error renaming view:', error)
    }
  }
}

/**
 * Delete the active view after confirmation.
 *
 * @function handleDeleteView
 * @returns {Promise<void>}
 */
export async function handleDeleteView () {
  const boardId = getCurrentBoardId()
  const viewId = getCurrentViewId()
  if (confirm('Are you sure you want to delete this view?')) {
    try {
      await deleteView(boardId, viewId)
      logger.log('View deleted:', viewId)
    } catch (error) {
      logger.error('Error deleting view:', error)
    }
  }
}
/**
 * Remove all widgets from the current view.
 *
 * @function handleResetView
 * @returns {Promise<void>}
 */
export async function handleResetView () {
  const boardId = getCurrentBoardId()
  const viewId = getCurrentViewId()
  if (confirm('Are you sure you want to reset this view?')) {
    try {
      await resetView(boardId, viewId)
      logger.log('View reset:', viewId)
    } catch (error) {
      logger.error('Error resetting view:', error)
    }
  }
}
