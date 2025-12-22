// @ts-check
/** @module fragmentKeyMap
 * Centralized key map for fragment minification.
 * Maps long property names to short tokens.
 * Expand cautiously and keep in sync across importer/exporter.
 */

/** @type {Record<string,string>} */
export const KEY_MAP = {
  version: 'v',
  name: 'n',
  id: 'i',
  type: 't',
  url: 'u',
  config: 'c',
  settings: 'S',
  data: 'd',
  state: 'st',
  params: 'p',
  options: 'o',
  description: 'ds',
  board: 'b',
  boards: 'B',
  view: 'vw',
  views: 'V',
  serviceId: 'si',
  service: 'sv',
  services: 's',
  widgetId: 'wi',
  widget: 'wg',
  widgets: 'w',
  // extra common keys
  globalSettings: 'gs',
  localStorage: 'ls',
  widgetState: 'ws',
  columns: 'c2',
  rows: 'r2',
  maxInstances: 'mi',
  order: 'or',
  dataid: 'di'
}

export default { KEY_MAP }
