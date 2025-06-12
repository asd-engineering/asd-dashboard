import { Logger } from '../../utils/Logger.js'

const logger = new Logger('dropDownUtils.js')

export function initializeDropdown (dropdownElement, handlers) {
  if (!dropdownElement) {
    logger.error('Dropdown element not found')
    return
  }

  dropdownElement.addEventListener('click', (event) => {
    const action = event.target.dataset.action // Assuming the action is stored in a data attribute
    logger.log('Dropdown action clicked:', action)

    if (handlers && typeof handlers[action] === 'function') {
      handlers[action]() // Call the corresponding handler function
    } else {
      logger.warn('Unknown or unhandled action:', action)
    }
  })
}
