// @ts-check
/**
 * Utilities for applying the dashboard theme.
 * @module ui/theme
 */

/** @typedef {import('../types.js').DashboardConfig} DashboardConfig */

/**
 * Enumeration of supported theme names.
 * @readonly
 * @enum {string}
 */
export const THEME = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark'
})

/**
 * Apply the given theme by setting a data attribute on <html>.
 * Falls back to 'light' when an unknown value is provided.
 * @function applyTheme
 * @param {string|undefined|null} theme
 * @returns {void}
 */
export function applyTheme (theme) {
  const name = theme === THEME.DARK ? THEME.DARK : THEME.LIGHT
  document.documentElement.setAttribute('data-theme', name)
}

/**
 * Initialize the theme from a configuration object.
 * @function initThemeFromConfig
 * @param {DashboardConfig|undefined|null} cfg
 * @returns {void}
 */
export function initThemeFromConfig (cfg) {
  const t = cfg?.globalSettings?.theme
  applyTheme(t || THEME.LIGHT)
}
