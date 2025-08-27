// @ts-check
/**
 * Helpers to merge arrays of boards or services.
 *
 * @module merge
 */

/** @typedef {import('../types.js').Board} Board */
/** @typedef {import('../types.js').Service} Service */
import { snapshotDedup } from './snapshotDedup.js'

/**
 * Merge board arrays by id.
 *
 * @param {Array<Board>} existingBoards
 * @param {Array<Board>} newBoards
 * @function mergeBoards
 * @returns {Array<Board>}
 */
export function mergeBoards (existingBoards = [], newBoards = []) {
  return snapshotDedup(
    [...existingBoards, ...newBoards],
    b => b.id,
    b => b.name
  )
}

/**
 * Merge service arrays by unique url or id.
 *
 * @param {Array<Service>} existingServices
 * @param {Array<Service>} newServices
 * @function mergeServices
 * @returns {Array<Service>}
 */
export function mergeServices (existingServices = [], newServices = []) {
  return snapshotDedup(
    [...existingServices, ...newServices],
    s => s.id || s.url,
    s => s.name
  )
}
