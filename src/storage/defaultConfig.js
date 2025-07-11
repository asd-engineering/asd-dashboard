// @ts-check
/**
 * Default dashboard configuration template used when no config is present.
 * @module storage/defaultConfig
 */

/** @typedef {import('../types.js').DashboardConfig} DashboardConfig */

/** @type {DashboardConfig} */
export const DEFAULT_CONFIG_TEMPLATE = {
  globalSettings: {
    theme: 'light',
    widgetStoreUrl: [],
    database: 'localStorage',
    hideBoardControl: false,
    hideViewControl: false,
    hideServiceControl: false,
    showMenuWidget: true,
    views: {
      showViewOptionsAsButtons: false,
      viewToShow: ''
    },
    localStorage: {
      enabled: 'true',
      loadDashboardFromConfig: 'true'
    }
  },
  boards: [],
  styling: {
    widget: { minColumns: 1, maxColumns: 8, minRows: 1, maxRows: 6 }
  }
}
