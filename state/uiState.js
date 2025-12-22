// @ts-check
/**
 * Global UI state flags and helpers.
 *
 * @module uiState
 */

/** @typedef {{jsonMode:boolean, advancedMode:boolean}} UIState */

const state = {
  jsonMode: false,
  advancedMode: false
}

/**
 * Get current JSON mode flag.
 *
 * @returns {boolean}
 */
export function isJsonMode () {
  return state.jsonMode
}

/**
 * Set JSON mode flag and notify listeners.
 *
 * @param {boolean} value
 * @returns {void}
 */
export function setJsonMode (value) {
  if (state.jsonMode === value) return
  state.jsonMode = value
  document.dispatchEvent(new CustomEvent('ui:json-mode', { detail: value }))
}

/**
 * Subscribe to JSON mode changes.
 *
 * @param {(value:boolean)=>void} handler
 * @returns {void}
 */
export function onJsonModeChange (handler) {
  document.addEventListener('ui:json-mode', e => {
    handler((/** @type {CustomEvent<boolean>} */(e)).detail)
  })
}

/**
 * Get current advanced mode flag.
 *
 * @returns {boolean}
 */
export function isAdvancedMode () {
  return state.advancedMode
}

/**
 * Set advanced mode flag and notify listeners.
 *
 * @param {boolean} value
 * @returns {void}
 */
export function setAdvancedMode (value) {
  if (state.advancedMode === value) return
  state.advancedMode = value
  document.dispatchEvent(new CustomEvent('ui:advanced-mode', { detail: value }))
}

/**
 * Subscribe to advanced mode changes.
 *
 * @param {(value:boolean)=>void} handler
 * @returns {void}
 */
export function onAdvancedModeChange (handler) {
  document.addEventListener('ui:advanced-mode', e => {
    handler((/** @type {CustomEvent<boolean>} */(e)).detail)
  })
}
