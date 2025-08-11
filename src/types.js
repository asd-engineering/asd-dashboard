// @ts-check

/**
 * Widget persisted in a board view.
 * @typedef {Object} Widget
 * @property {string} [dataid]
 * @property {string} [serviceId]
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
 * Base template for services.
 * @typedef {Object} ServiceTemplate
 * @property {string} [type]
 * @property {ServiceConfig} [config]
 * @property {number} [maxInstances]
 */

/**
 * External service definition.
 * @typedef {Object} Service
 * @property {string} id - A unique identifier for the service definition.
 * @property {string} name
 * @property {string} url
 * @property {string} [type]
 * @property {string} [category]
 * @property {string} [subcategory]
 * @property {Array<string>} [tags]
 * @property {ServiceConfig} [config]
 * @property {number} [maxInstances] Maximum allowed widget instances
 * @property {string} [template] - The key of the template to inherit from
 * @property {{name:string,url:string,method?:string,headers?:Object}} [fallback]
 */

/**
 * Dashboard configuration loaded from storage or URL.
 * @typedef {Object} DashboardConfig
 * @property {object} [globalSettings]
 * @property {string} [globalSettings.theme]
 * @property {Array<string>} [globalSettings.widgetStoreUrl]
 * @property {string} [globalSettings.database]
 * @property {boolean|string} [globalSettings.hideBoardControl]
 * @property {boolean|string} [globalSettings.hideViewControl]
 * @property {boolean|string} [globalSettings.hideServiceControl]
 * @property {boolean|string} [globalSettings.showMenuWidget]
 * @property {{showViewOptionsAsButtons:boolean|string, viewToShow:string}} [globalSettings.views]
 * @property {{enabled:string, loadDashboardFromConfig:string, defaultBoard?:string, defaultView?:string}} [globalSettings.localStorage]
 * @property {number} [globalSettings.maxTotalInstances]
 * @property {Array<Board>} [boards]
 * @property {Object.<string, ServiceTemplate>} [serviceTemplates]
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
