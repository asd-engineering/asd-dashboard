// @ts-check
/**
 * Helpers to merge arrays of boards or services.
 *
 * @module merge
 */

/** @typedef {import('../types.js').Board} Board */
/** @typedef {import('../types.js').Service} Service */

/**
 * Merge board arrays by id.
 *
 * @param {Array<Board>} existingBoards
 * @param {Array<Board>} newBoards
 * @function mergeBoards
 * @returns {Array<Board>}
 */
export function mergeBoards (existingBoards = [], newBoards = []) {
  const merged = [...existingBoards]
  const seen = new Set(existingBoards.map(b => b.id))
  for (const board of newBoards) {
    if (!seen.has(board.id)) {
      merged.push(board)
      seen.add(board.id)
    }
  }
  return merged
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
  const merged = [...existingServices]
  const key = s => s.id || s.url
  const seen = new Set(existingServices.map(key))
  for (const svc of newServices) {
    const k = key(svc)
    if (!seen.has(k)) {
      merged.push(svc)
      seen.add(k)
    }
  }
  return merged
}
