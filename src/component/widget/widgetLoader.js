// @ts-check
/**
 * Load widgets from a configuration object into the DOM.
 *
 * @module widgetLoader
 */
import { createWidget } from './widgetManagement.js'
import { getServiceFromUrl } from './utils/widgetUtils.js'
import { initializeResizeHandles } from './events/resizeHandler.js'

/** @typedef {import('../../types.js').Widget} Widget */

/**
 * Instantiate widgets defined in a view configuration.
 * Objects missing a `version` field are defaulted to "1" for backward compatibility.
 *
 * @param {Array<Widget>} widgets
 * @function loadWidgetsFromConfig
 * @returns {Promise<void>}
 */
export async function loadWidgetsFromConfig (widgets) {
  const container = document.getElementById('widget-container')
  if (!container) return
  for (const data of widgets) {
    if (!data) {
      console.debug('loadWidgetsFromConfig: skipped falsy widget')
      continue
    }
    const existing = container.querySelector(`[data-dataid="${data.dataid}"]`)
    if (existing && !document.contains(existing)) existing.remove()
    await new Promise(resolve => window.requestAnimationFrame(resolve)) // allow detach cycle
    if (container.querySelector(`[data-dataid="${data.dataid}"]`)) {
      console.debug('loadWidgetsFromConfig: widget already exists', data.dataid)
      continue
    }
    if (!data.version) {
      console.debug('loadWidgetsFromConfig: applying default version to', data.dataid)
      data.version = '1'
    }
    const service = await getServiceFromUrl(data.url)
    const el = await createWidget(
      service,
      data.url,
      Number(data.columns),
      Number(data.rows),
      data.dataid,
      data.version
    )
    el.dataset.order = String(data.order)
    el.style.order = String(data.order)
    el.dataset.type = data.type
    el.dataset.version = String(data.version)
    el.dataset.metadata = JSON.stringify(data.metadata || {})
    el.dataset.settings = JSON.stringify(data.settings || {})
    container.appendChild(el)
  }
  initializeResizeHandles()
}
