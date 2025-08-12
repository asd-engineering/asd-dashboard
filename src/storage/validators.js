// @ts-check
/**
 * Zero-dependency validators and sanitizers for config, boards and services.
 * @module storage/validators
 */

/**
 * @param {any} x
 * @returns {boolean}
 */
function isStr (x) { return typeof x === 'string' && x.length >= 0 }
/**
 * @param {any} x
 * @returns {boolean}
 */
function isNum (x) { return typeof x === 'number' && Number.isFinite(x) }
/**
 * @param {any} x
 * @param {string} [d]
 * @returns {string}
 */
function asStr (x, d = '') { return isStr(x) ? x : d }
/**
 * @param {any} x
 * @param {number} [d]
 * @returns {number}
 */
function asNum (x, d = 0) { return isNum(x) ? x : (typeof x === 'string' && !isNaN(+x) ? +x : d) }

/**
 * Sanitize an array of services.
 * @function sanitizeServices
 * @param {any} svcs
 * @returns {Array<object>}
 */
export function sanitizeServices (svcs) {
  if (!Array.isArray(svcs)) return []
  return svcs
    .filter(s => s && typeof s === 'object')
    .map(s => ({
      name: asStr(s.name),
      url: asStr(s.url, ''),
      ...s
    }))
    .filter(s => s.name)
}

/**
 * @param {any} ws
 * @returns {Array<object>}
 */
function sanitizeWidgetState (ws) {
  if (!Array.isArray(ws)) return []
  return ws
    .filter(w => w && typeof w === 'object')
    .map(w => ({
      dataid: asStr(w.dataid),
      url: asStr(w.url),
      columns: asNum(w.columns, 1),
      rows: asNum(w.rows, 1),
      type: asStr(w.type, 'iframe'),
      metadata: w.metadata ?? {},
      settings: w.settings ?? {},
      ...w
    }))
    .filter(w => w.dataid && w.url)
}

/**
 * @param {any} views
 * @returns {Array<object>}
 */
function sanitizeViews (views) {
  if (!Array.isArray(views)) return []
  return views
    .filter(v => v && typeof v === 'object')
    .map(v => ({
      id: asStr(v.id),
      name: asStr(v.name),
      widgetState: sanitizeWidgetState(v.widgetState),
      ...v
    }))
    .filter(v => v.id && v.name)
}

/**
 * Sanitize an array of boards.
 * @function sanitizeBoards
 * @param {any} boards
 * @returns {Array<object>}
 */
export function sanitizeBoards (boards) {
  if (!Array.isArray(boards)) return []
  return boards
    .filter(b => b && typeof b === 'object')
    .map(b => ({
      id: asStr(b.id),
      name: asStr(b.name),
      order: asNum(b.order, 0),
      views: sanitizeViews(b.views),
      ...b
    }))
    .filter(b => b.id && b.name && Array.isArray(b.views))
}

/**
 * Sanitize the dashboard configuration.
 * @function sanitizeConfig
 * @param {any} cfg
 * @returns {object}
 */
export function sanitizeConfig (cfg) {
  if (!cfg || typeof cfg !== 'object') return {}
  const out = { ...cfg }
  if (out.globalSettings && typeof out.globalSettings !== 'object') out.globalSettings = {}
  return out
}
