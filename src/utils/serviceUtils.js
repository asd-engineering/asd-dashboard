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
