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
  serviceTemplates: {
    default: {
      type: 'iframe',
      maxInstances: 1,
      config: { minColumns: 1, maxColumns: 8, minRows: 1, maxRows: 6 }
    },
    'api-service': {
      type: 'api',
      maxInstances: 5,
      config: { minColumns: 1, maxColumns: 2, minRows: 1, maxRows: 2 }
    }
  },
  styling: {
    widget: { minColumns: 1, maxColumns: 8, minRows: 1, maxRows: 6 }
  }
}
