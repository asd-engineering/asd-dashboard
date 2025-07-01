// @ts-check
/**
 * Unique identifier generators for dashboard entities.
 *
 * @module id
 */
import { getUUID } from './utils.js'

/**
 * Generate a unique widget id.
 *
 * @function widgetGetUUID
 * @returns {string}
 */
function widgetGetUUID () {
  return `widget-${getUUID()}`
}

/**
 * Generate a unique board id.
 *
 * @function boardGetUUID
 * @returns {string}
 */
function boardGetUUID () {
  return `board-${getUUID()}`
}

/**
 * Generate a unique view id.
 *
 * @function viewGetUUID
 * @returns {string}
 */
function viewGetUUID () {
  return `view-${getUUID()}`
}

export { widgetGetUUID, boardGetUUID, viewGetUUID }
