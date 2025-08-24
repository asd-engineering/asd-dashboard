// @ts-check
/**
 * Text constants for the eviction modal.
 * @module eviction-messages
 */

/**
 * @typedef {Object} EvictionMessages
 * @property {(n:number)=>string} header
 * @property {(max:number)=>string} subtextMax
 * @property {()=>string} disclaimer
 */

/** @type {EvictionMessages} */
export const evictionMessages = {
  header: (n) => n === 1 ? '1 widget must be removed to continue navigation.' : `${n} widgets must be removed to continue navigation.`,
  subtextMax: (max) => `Limit: Max widgets per service = ${max}.`,
  disclaimer: () => 'You are removing a widget from memory. Unsaved data in that widget may be lost (same as page refresh).'
}

export default evictionMessages
