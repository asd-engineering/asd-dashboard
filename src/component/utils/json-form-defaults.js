// @ts-check
/**
 * Central defaults and placeholders for JsonForm.
 *
 * @module json-form-defaults
 */

/**
 * Templates mapped by dotted path patterns. Patterns may use `[]` to match
 * any array index.
 */
export const DEFAULT_TEMPLATES = {
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
  'services[]': {
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
  },
  'services[].tags[]': '',
  'serviceTemplates.default': {
    type: 'iframe',
    maxInstances: 10,
    config: { minColumns: 1, maxColumns: 4, minRows: 1, maxRows: 4 }
  }
}

/**
 * Placeholder texts mapped by path patterns.
 */
export const DEFAULT_PLACEHOLDERS = {
  servicesUrl: 'https://example.com/services.json',
  'boards[].views[].widgetState[].url': 'https://…',
  'boards[].views[].widgetState[].type': 'iframe'
}
