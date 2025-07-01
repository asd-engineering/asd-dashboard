// @ts-check

/**
 * Widget persisted in a board view.
 * @typedef {Object} Widget
 * @property {string} [dataid]
 * @property {string} url
 * @property {number|string} columns
 * @property {number|string} rows
 * @property {string} [type]
 * @property {string} [order]
 * @property {Record<string, any>} [metadata]
 * @property {Record<string, any>} [settings]
 */

/**
 * Collection of widgets for a board view.
 * @typedef {Object} View
 * @property {string} id
 * @property {string} name
 * @property {Array<Widget>} widgetState
 */

/**
 * Board containing views of widgets.
 * @typedef {Object} Board
 * @property {string} id
 * @property {string} name
 * @property {number} [order]
 * @property {Array<View>} views
 */

/**
 * Optional configuration for a service.
 * @typedef {Object} ServiceConfig
 * @property {number} [minColumns]
 * @property {number} [maxColumns]
 * @property {number} [minRows]
 * @property {number} [maxRows]
 */

/**
 * External service definition.
 * @typedef {Object} Service
 * @property {string} name
 * @property {string} url
 * @property {string} [type]
 * @property {ServiceConfig} [config]
 */

/**
 * Dashboard configuration loaded from storage or URL.
 * @typedef {Object} DashboardConfig
 * @property {{widgetCacheSize?: number}} [globalSettings]
 * @property {Array<Board>} [boards]
 * @property {{widget: {minColumns:number, maxColumns:number, minRows:number, maxRows:number}}} [styling]
*/

/**
 * Structured entry written by {@link Logger} during tests.
 * @typedef {Object} LoggerEntry
 * @property {string} file
 * @property {string} fn
 * @property {string} level
 * @property {string} message
 * @property {string} time
 */

export {}
