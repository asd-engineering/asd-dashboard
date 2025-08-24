// @ts-check
/**
 * View-model for eviction modal selection logic.
 * @module evictionModalViewModel
 */

/**
 * @typedef {Object} EvictionItem
 * @property {string} id
 * @property {string|null} title
 * @property {string} serviceName
 * @property {string} icon
 * @property {number} boardIndex
 * @property {number} viewIndex
 * @property {number} lruRank
 */

/**
 * Create a view-model for the eviction modal.
 *
 * @param {{reason:string, maxPerService:number|null, requiredCount:number|null, items:EvictionItem[]}} opts
 * @returns {{
 *  reason:string,
 *  maxPerService:number|null,
 *  requiredCount:number|null,
 *  items:EvictionItem[],
 *  selectionLimit:number,
 *  state:{selectedIds:Set<string>,selectedOrder:string[],canProceed:boolean},
 *  displayName:(item:EvictionItem)=>string,
 *  lruPick:(n:number)=>EvictionItem[],
 *  toggle:(id:string)=>string|undefined,
 *  autoSelectLru:()=>string[]
 * }}
*/
export function createEvictionViewModel (opts) {
  const selectionLimit = (opts.requiredCount && opts.requiredCount > 0) ? opts.requiredCount : 1

  const state = {
    selectedIds: new Set(),
    selectedOrder: [],
    canProceed: false
  }

  const update = () => {
    state.canProceed = state.selectedIds.size === selectionLimit
  }

  /**
   * Build display name for an item.
   * @param {EvictionItem} item
   * @returns {string}
   */
  const displayName = (item) => {
    const base = item.title ?? item.serviceName
    return `${base} — Board ${item.boardIndex + 1}, View ${item.viewIndex + 1}`
  }

  /**
   * Returns the first n items by lru rank.
   * @param {number} n
   * @returns {EvictionItem[]}
   */
  const lruPick = (n) => [...opts.items].sort((a, b) => a.lruRank - b.lruRank).slice(0, n)

  /**
   * Toggle selection of an id. Returns id removed due to overflow, if any.
   * @param {string} id
   * @returns {string|undefined}
   */
  const toggle = (id) => {
    let removed
    if (state.selectedIds.has(id)) {
      state.selectedIds.delete(id)
      const idx = state.selectedOrder.indexOf(id)
      if (idx >= 0) state.selectedOrder.splice(idx, 1)
    } else {
      if (state.selectedIds.size === selectionLimit) {
        removed = state.selectedOrder.shift()
        if (removed) state.selectedIds.delete(removed)
      }
      state.selectedIds.add(id)
      state.selectedOrder.push(id)
    }
    update()
    return removed
  }

  /**
   * Auto-select least recently used items and return selected ids.
   * @returns {string[]}
   */
  const autoSelectLru = () => {
    state.selectedIds.clear()
    state.selectedOrder.length = 0
    const pick = lruPick(selectionLimit)
    for (const item of pick) {
      state.selectedIds.add(item.id)
      state.selectedOrder.push(item.id)
    }
    update()
    return [...state.selectedIds]
  }

  return { ...opts, selectionLimit, state, displayName, lruPick, toggle, autoSelectLru }
}

export default createEvictionViewModel
