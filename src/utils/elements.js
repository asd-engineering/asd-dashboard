/**
 * DOM element helpers.
 *
 * @module elements
 */

/**
 * Get the id of the currently active board element.
 *
 * @returns {string}
 */
export function getCurrentBoardId () {
  return document.querySelector('.board').id
}

/**
 * Get the id of the currently active view element.
 *
 * @returns {string}
 */
export function getCurrentViewId () {
  return document.querySelector('.board-view').id
}
