// @ts-check
/**
 * Deduplicate arrays by stable ids and normalized names.
 *
 * @module snapshotDedup
 */

/**
 * Normalize a name for comparison.
 * @param {string|undefined} n
 * @returns {string}
 */
function norm (n) {
  return (n || '').trim().toLowerCase()
}

/**
 * Deduplicate items keeping first occurrence.
 * @template T
 * @param {Array<T>} items
 * @param {(item:T)=>string|undefined} getId
 * @param {(item:T)=>string|undefined} getName
 * @returns {Array<T>}
 * @function snapshotDedup
 */
export function snapshotDedup (items, getId, getName) {
  const seenIds = new Set()
  const seenNames = new Set()
  const out = []
  for (const item of items) {
    const id = getId(item)
    const name = norm(getName(item))
    if ((id && seenIds.has(id)) || (name && seenNames.has(name))) continue
    if (id) seenIds.add(id)
    if (name) seenNames.add(name)
    out.push(item)
  }
  return out
}
