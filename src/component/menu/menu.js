// @ts-check
/**
 * Build and initialize the main dashboard menu UI.
 *
 * @module menu
 */
import emojiList from '../../ui/unicodeEmoji.js'
import { showNotification } from '../dialog/notification.js'

/**
 * Initialize service worker controls in the menu.
 *
 * @function initSW
 * @returns {void}
 */
function initSW () {
  const swToggle = /** @type {HTMLInputElement} */(document.getElementById('sw-toggle'))
  const swIcon = document.querySelector('.sw-icon')
  /** @type {HTMLElement} */
  const swCheckbox = document.querySelector('.icon-checkbox')
  const swEnabled = localStorage.getItem('swEnabled') === 'true'
  swToggle.checked = swEnabled

  /**
   * Updates the UI of the service worker toggle icon and attributes.
   * @function updateServiceWorkerUI
   * @param {boolean} isEnabled - True if the service worker should be shown as enabled.
   * @returns {void}
   */
  function updateServiceWorkerUI (isEnabled) {
    if (isEnabled) {
      swIcon.textContent = emojiList.serviceWorkerEnabled.unicode // Network On
      swCheckbox.setAttribute('aria-checked', 'true')
      swCheckbox.setAttribute('title', 'Service worker is enabled')
    } else {
      swIcon.textContent = emojiList.serviceWorkerDisabled.unicode // Network Off
      swCheckbox.setAttribute('aria-checked', 'false')
      swCheckbox.setAttribute('title', 'Service worker is disabled')
    }
  }

  updateServiceWorkerUI(swEnabled)

  if ('serviceWorker' in navigator) {
    /**
     * Registers the service worker script.
     * @function registerServiceWorker
     * @returns {void}
     */
    function registerServiceWorker () {
      navigator.serviceWorker.register('/serviceWorker.js', { scope: '/' })
        .then(function (registration) {
          console.log('Service Worker registered with scope:', registration.scope)
        })
        .catch(function (error) {
          console.error('Service Worker registration failed:', error)
        })
    }

    /**
     * Unregisters all active service workers and clears their caches.
     * @function unregisterServiceWorker
     * @returns {void}
     */
    function unregisterServiceWorker () {
      navigator.serviceWorker.getRegistrations()
        .then(function (registrations) {
          for (const registration of registrations) {
            registration.unregister()
              .then(function () {
                console.log('Service Worker unregistered')
              })
              .catch(function (error) {
                console.error('Service Worker unregistration failed:', error)
              })
          }
        })
      caches.keys().then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            return caches.delete(cacheName)
          })
        ).then(function () {
          console.log('All caches cleared')
        })
      })
    }

    if (swEnabled) {
      registerServiceWorker()
    } else {
      unregisterServiceWorker()
    }

    swToggle.addEventListener('change', function () {
      const isEnabled = swToggle.checked
      localStorage.setItem('swEnabled', String(isEnabled))
      updateServiceWorkerUI(isEnabled)
      showNotification(`Service Worker ${isEnabled ? 'Enabled' : 'Disabled'}`, 500)

      if (isEnabled) {
        registerServiceWorker()
      } else {
        unregisterServiceWorker()
      }
    })
  }
}

/**
 * Create the main dashboard menu and insert it into the page.
 *
 * @function initializeMainMenu
 * @returns {void}
 */
function initializeMainMenu () {
  const menu = document.createElement('menu')
  menu.id = 'controls'

  // Board control group
  const boardControl = document.createElement('div')
  boardControl.className = 'control-group'
  boardControl.id = 'board-control'

  const boardSelector = document.createElement('select')
  boardSelector.id = 'board-selector'
  boardControl.appendChild(boardSelector)

  const boardDropdown = document.createElement('div')
  boardDropdown.id = 'board-dropdown'
  boardDropdown.className = 'dropdown'

  const boardButton = document.createElement('button')
  boardButton.className = 'dropbtn'
  boardButton.textContent = 'Board Actions'
  boardDropdown.appendChild(boardButton)

  const boardDropdownContent = document.createElement('div')
  boardDropdownContent.className = 'dropdown-content';

  ['create', 'rename', 'delete'].forEach(action => {
    const actionLink = document.createElement('a')
    actionLink.href = '#'
    actionLink.dataset.action = action
    actionLink.textContent = action.charAt(0).toUpperCase() + action.slice(1) + ' Board'
    boardDropdownContent.appendChild(actionLink)
  })

  boardDropdown.appendChild(boardDropdownContent)
  boardControl.appendChild(boardDropdown)
  menu.appendChild(boardControl)

  // View control group
  const viewControl = document.createElement('div')
  viewControl.className = 'control-group'
  viewControl.id = 'view-control'

  const viewSelector = document.createElement('select')
  viewSelector.id = 'view-selector'
  viewControl.appendChild(viewSelector)

  const viewDropdown = document.createElement('div')
  viewDropdown.id = 'view-dropdown'
  viewDropdown.className = 'dropdown'

  const viewButton = document.createElement('button')
  viewButton.className = 'dropbtn'
  viewButton.textContent = 'View Actions'
  viewDropdown.appendChild(viewButton)

  const viewDropdownContent = document.createElement('div')
  viewDropdownContent.className = 'dropdown-content';

  ['create', 'rename', 'delete', 'reset'].forEach(action => {
    const actionLink = document.createElement('a')
    actionLink.href = '#'
    actionLink.dataset.action = action
    actionLink.textContent = action.charAt(0).toUpperCase() + action.slice(1) + ' View'
    viewDropdownContent.appendChild(actionLink)
  })

  viewDropdown.appendChild(viewDropdownContent)
  viewControl.appendChild(viewDropdown)
  menu.appendChild(viewControl)

  // Service control group
  const serviceControl = document.createElement('div')
  serviceControl.className = 'control-group'
  serviceControl.id = 'service-control'

  const serviceSelector = document.createElement('select')
  serviceSelector.id = 'service-selector'

  const defaultOption = document.createElement('option')
  defaultOption.value = ''
  defaultOption.textContent = 'Select a Service'
  serviceSelector.appendChild(defaultOption)
  serviceControl.appendChild(serviceSelector)

  const widgetUrlInput = document.createElement('input')
  widgetUrlInput.type = 'text'
  widgetUrlInput.id = 'widget-url'
  widgetUrlInput.placeholder = 'Or enter URL manually'
  serviceControl.appendChild(widgetUrlInput)

  const addWidgetButton = document.createElement('button')
  addWidgetButton.id = 'add-widget-button'
  addWidgetButton.textContent = 'Add Widget'
  serviceControl.appendChild(addWidgetButton)

  menu.appendChild(serviceControl)

  // Admin control group
  const adminControl = document.createElement('div')
  adminControl.className = 'control-group'
  adminControl.id = 'admin-control'

  const widgetMenuToggler = document.createElement('label')
  widgetMenuToggler.id = 'toggle-widget-menu'
  widgetMenuToggler.ariaLabel = 'Toggle Widget Menu'
  widgetMenuToggler.title = 'Toggle Widget Menu'
  widgetMenuToggler.textContent = emojiList.edit.unicode
  adminControl.appendChild(widgetMenuToggler)

  const swLabel = document.createElement('label')
  swLabel.htmlFor = 'sw-toggle'
  swLabel.className = 'icon-checkbox'
  swLabel.ariaLabel = 'Toggle service worker'
  swLabel.title = 'Toggle service worker'

  const swCheckbox = document.createElement('input')
  swCheckbox.type = 'checkbox'
  swCheckbox.id = 'sw-toggle'
  swLabel.appendChild(swCheckbox)

  const swIcon = document.createElement('span')
  swIcon.className = 'sw-icon'
  swLabel.appendChild(swIcon)
  adminControl.appendChild(swLabel)

  const storageEditorLabel = document.createElement('label')
  storageEditorLabel.id = 'localStorage-edit-button'
  storageEditorLabel.ariaLabel = 'Storage editor'
  storageEditorLabel.title = 'Storage editor'
  storageEditorLabel.textContent = emojiList.floppyDisk.unicode
  adminControl.appendChild(storageEditorLabel)

  const configEditorLabel = document.createElement('label')
  configEditorLabel.id = 'open-config-modal'
  configEditorLabel.ariaLabel = 'Config editor'
  configEditorLabel.title = 'Config editor'
  configEditorLabel.textContent = emojiList.gear.unicode
  adminControl.appendChild(configEditorLabel)

  const resetButton = document.createElement('label')
  resetButton.id = 'reset-button'
  resetButton.ariaLabel = 'Permanently reset ASD Dashboard'
  resetButton.title = 'Permanently reset ASD Dashboard'
  resetButton.textContent = `${emojiList.crossCycle.unicode}`
  adminControl.appendChild(resetButton)

  menu.appendChild(adminControl)

  document.body.insertBefore(menu, document.body.firstChild) // Append as the first child
  initSW()
}

/**
 * Applies visibility settings to control groups based on global configuration.
 * @function applyControlVisibility
 * @returns {void}
 */
function applyControlVisibility () {
  const settings = window.asd.config?.globalSettings || {}
  const boardControl = document.getElementById('board-control')
  if (boardControl) {
    boardControl.style.display = settings.hideBoardControl === true || settings.hideBoardControl === 'true' ? 'none' : ''
  }
  const viewControl = document.getElementById('view-control')
  if (viewControl) {
    viewControl.style.display = settings.hideViewControl === true || settings.hideViewControl === 'true' ? 'none' : ''
  }
  const serviceControl = document.getElementById('service-control')
  if (serviceControl) {
    serviceControl.style.display = settings.hideServiceControl === true || settings.hideServiceControl === 'true' ? 'none' : ''
  }
}

export { initializeMainMenu, applyControlVisibility }
