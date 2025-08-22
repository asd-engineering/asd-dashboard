// @ts-check
/**
 * Default templates for arrays handled by JsonForm.
 *
 * @module json-form-defaults
 */

export const JSON_FORM_ARRAY_DEFAULTS = {
  boards: { id: '', name: '', views: [] },
  views: { id: '', name: '', widgetState: [] },
  widgetState: {
    dataid: '',
    serviceId: '',
    url: '',
    columns: 1,
    rows: 1,
    type: '',
    order: '',
    metadata: {},
    settings: {}
  },
  tags: '',
  services: {
    id: '',
    name: 'Unnamed Service',
    url: '',
    type: 'iframe',
    category: '',
    subcategory: '',
    tags: [],
    config: {},
    maxInstances: null,
    template: undefined,
    fallback: undefined
  }
}

/**
 * Default templates for nested config arrays keyed by path patterns.
 */
export const JSON_FORM_TEMPLATES = {
  'boards[]': { id: '', name: '', order: 0, views: [] },
  'boards[].views[]': { id: '', name: '', widgetState: [] },
  'boards[].views[].widgetState[]': {
    dataid: '',
    serviceId: '',
    order: 0,
    url: '',
    columns: 1,
    rows: 1,
    type: 'iframe',
    metadata: {},
    settings: {}
  },
  serviceTemplates: {},
  'serviceTemplates.default': {
    type: 'iframe',
    maxInstances: 10,
    config: { minColumns: 1, maxColumns: 4, minRows: 1, maxRows: 4 }
  }
}

/**
 * Placeholder texts mapped by path patterns.
 */
export const JSON_FORM_PLACEHOLDERS = {
  'globalSettings.widgetStoreUrl[]': 'https://…',
  'boards[].views[].widgetState[].url': 'https://…',
  'boards[].views[].widgetState[].type': 'iframe'
}
