// @ts-check
/**
 * Synchronize board and view labels within the service menu.
 *
 * @module serviceMenuLabels
 */
import StorageManager from '../../storage/StorageManager.js'

/**
 * Update the board and view label elements with current names.
 *
 * @function syncBoardViewLabels
 * @param {HTMLElement|Document} [root=document] - Root element to scope the query.
 * @returns {void}
 */
export function syncBoardViewLabels (root = document) {
  const scope = /** @type {HTMLElement|Document} */ (root)
  const boards = StorageManager.getBoards()
  const boardId = StorageManager.misc.getLastBoardId()
  const viewId = StorageManager.misc.getLastViewId()
  const board = boards.find(b => b.id === boardId)
  const boardName = board ? board.name : ''
  const viewName = board?.views.find(v => v.id === viewId)?.name || ''

  const boardLabel = scope.querySelector('[data-role="label-board"]')
  const viewLabel = scope.querySelector('[data-role="label-view"]')
  if (boardLabel) {
    boardLabel.textContent = boardName
    boardLabel.setAttribute('title', boardName)
  }
  if (viewLabel) {
    viewLabel.textContent = viewName
    viewLabel.setAttribute('title', viewName)
  }
}

/**
 * Convenience helper that syncs labels against the service menu root.
 *
 * @function updateServiceMenuLabels
 * @returns {void}
 */
export function updateServiceMenuLabels () {
  const root = document.getElementById('service-control')
  if (root) syncBoardViewLabels(root)
}
