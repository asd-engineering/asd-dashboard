// @ts-check
/**
 * Utilities for resolving service configurations with templates.
 * @module utils/serviceUtils
 */
import { StorageManager } from '../storage/StorageManager.js'
import { deepMerge } from './objectUtils.js'

/**
 * Takes a raw service object and merges it with its declared template.
 * The service's own properties will override any property from the template.
 * @param {Partial<import('../types.js').Service>} rawService The service object from storage.
 * @returns {import('../types.js').Service} The fully resolved service object.
 */
export function resolveServiceConfig (rawService) {
  const config = StorageManager.getConfig()
  const templates = config.serviceTemplates || {}

  const templateName = rawService.template || 'default'
  const baseTemplate = templates[templateName] || templates.default || {}

  return /** @type {import('../types.js').Service} */ (deepMerge(baseTemplate, rawService))
}

/**
 * The key a widget is filed under for per-service instance counting.
 *
 * `id` is optional on a service (a URL-matched service that no entry in
 * storage declares an id for resolves without one), so every place that counts
 * instances has to agree on the same fallback. They previously did not:
 * `createWidget` wrote `dataset.serviceId = serviceObj.id`, which stringifies
 * to the literal `"undefined"`, while the panels counted `w.serviceId === id`
 * with `id === undefined` — so an id-less service reported 0 instances in the
 * UI while `addWidget` refused to add more. One helper, one key, everywhere.
 *
 * @param {{id?: string, name?: string}} resolved - Resolved service config.
 * @param {string} [fallbackName] - Name to use when the service carries neither
 *   an id nor a name (e.g. the name `addWidget` derived from the widget URL).
 * @returns {string|undefined} The counting key, or undefined when there is none.
 */
export function serviceLimitKey (resolved, fallbackName) {
  return resolved?.id || resolved?.name || fallbackName
}
