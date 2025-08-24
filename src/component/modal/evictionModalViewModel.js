// @ts-check
/**
 * View-model for eviction modal selection logic.
 * @module evictionModalViewModel
 */

/**
 * @typedef {Object} EvictionItem
 * @property {string} id
 * @property {string} title
 * @property {string} icon
 * @property {number} boardIndex
 * @property {number} viewIndex
 * @property {number} lruRank
 */

/**
 * Create a view-model for the eviction modal.
 *
 * @param {{reason:string, maxPerService:number, requiredCount:number|null, items:EvictionItem[]}} opts
 * @returns {{
 *  reason:string,
 *  maxPerService:number,
 *  requiredCount:number|null,
 *  items:EvictionItem[],
 *  selectionLimit:number,
 *  state:{selected:Set<string>, canProceed:boolean},
 *  toggle:(id:string)=>string|undefined,
 *  autoSelectLru:()=>string[]
 * }}
 */
export function createEvictionViewModel (opts) {
  const selectionLimit = (opts.requiredCount && opts.requiredCount > 0) ? opts.requiredCount : 1
  /** @type {string[]} */
  const order = []
  const state = {
    selected: new Set(),
    canProceed: false
  }

  const update = () => {
    state.canProceed = state.selected.size === selectionLimit
  }

  /**
   * Toggle selection of an id. Returns id removed due to overflow, if any.
   * @param {string} id
   * @returns {string|undefined}
   */
  const toggle = (id) => {
    let removed
    if (state.selected.has(id)) {
      state.selected.delete(id)
      const idx = order.indexOf(id)
      if (idx >= 0) order.splice(idx, 1)
    } else {
      if (state.selected.size === selectionLimit) {
        removed = order.shift()
        if (removed) state.selected.delete(removed)
      }
      state.selected.add(id)
      order.push(id)
    }
    update()
    return removed
  }

  /**
   * Auto-select least recently used items and return selected ids.
   * @returns {string[]}
   */
  const autoSelectLru = () => {
    state.selected.clear()
    order.length = 0
    const pick = [...opts.items]
      .sort((a, b) => a.lruRank - b.lruRank)
      .slice(0, selectionLimit)
    for (const item of pick) {
      state.selected.add(item.id)
      order.push(item.id)
    }
    update()
    return [...state.selected]
  }

  return { ...opts, selectionLimit, state, toggle, autoSelectLru }
}

export default createEvictionViewModel
