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
