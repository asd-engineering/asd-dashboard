// @ts-check
/**
 * Shared dropdown initialization helper.
 *
 * @module dropDownUtils
 */
import { Logger } from '../../utils/Logger.js'

const logger = new Logger('dropDownUtils.js')

/**
 * Attach click handlers to a dropdown based on data-action attributes.
 *
 * @param {HTMLElement} dropdownElement - The dropdown container element.
 * @param {Object<string,Function>} handlers - Map of action names to callbacks.
 * @function initializeDropdown
 * @returns {void}
 */
export function initializeDropdown (dropdownElement, handlers) {
  if (!dropdownElement) {
    logger.error('Dropdown element not found')
    return
  }

  dropdownElement.addEventListener('click', (event) => {
    const action = /** @type {HTMLElement} */(event.target).dataset.action // Assuming the action is stored in a data attribute
    logger.log('Dropdown action clicked:', action)

    if (handlers && typeof handlers[action] === 'function') {
      handlers[action]() // Call the corresponding handler function
    } else {
      logger.warn('Unknown or unhandled action:', action)
    }
  })
}
