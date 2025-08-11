// @ts-check
/**
 * Build and initialize the main dashboard menu UI.
 *
 * @module menu
 */
import emojiList from '../../ui/unicodeEmoji.js'
import { showNotification } from '../dialog/notification.js'
import { debounceLeading } from '../../utils/utils.js'
import StorageManager from '../../storage/StorageManager.js'

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
  const swEnabled = StorageManager.misc.getItem('swEnabled') === 'true'
  swToggle.checked = swEnabled

  const buttonDebounce = 200

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
        .catch(function (error) {
          console.error('Service Worker registration retrieval failed:', error)
        })
      caches.keys()
        .then(function (cacheNames) {
          return Promise.all(
            cacheNames.map(function (cacheName) {
              return caches.delete(cacheName)
            })
          ).then(function () {
            // console.log('All caches cleared')
          })
        })
        .catch(function (error) {
          console.error('Cache clearing failed:', error)
        })
    }

    if (swEnabled) {
      registerServiceWorker()
    } else {
      unregisterServiceWorker()
    }

    const handleSwChange = debounceLeading(() => {
      const isEnabled = swToggle.checked
      StorageManager.misc.setItem('swEnabled', String(isEnabled))
      updateServiceWorkerUI(isEnabled)
      showNotification(`Service Worker ${isEnabled ? 'Enabled' : 'Disabled'}`, 500)

      if (isEnabled) {
        registerServiceWorker()
      } else {
        unregisterServiceWorker()
      }
    }, buttonDebounce)
    swToggle.addEventListener('change', /** @type {EventListener} */(handleSwChange))
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

  menu.appendChild(boardControl)

  // View control group
  const viewControl = document.createElement('div')
  viewControl.className = 'control-group'
  viewControl.id = 'view-control'

  const viewSelector = document.createElement('select')
  viewSelector.id = 'view-selector'
  viewControl.appendChild(viewSelector)

  menu.appendChild(viewControl)

  const viewButtonMenu = document.createElement('div')
  viewButtonMenu.className = 'control-group'
  viewButtonMenu.id = 'view-button-menu'
  menu.appendChild(viewButtonMenu)

  // Service control group
  const serviceControl = document.createElement('div')
  serviceControl.className = 'control-group'
  serviceControl.id = 'service-control'

  const widgetPanel = document.createElement('div')
  widgetPanel.id = 'widget-selector-panel'
  widgetPanel.className = 'dropdown'

  const widgetInput = document.createElement('input')
  widgetInput.id = 'widget-search'
  widgetInput.placeholder = 'Search or Select Widget'
  widgetPanel.appendChild(widgetInput)

  const widgetToggle = document.createElement('span')
  widgetToggle.id = 'widget-dropdown-toggle'
  widgetToggle.className = 'dropdown-arrow'
  widgetToggle.textContent = '\u25BC'
  widgetPanel.appendChild(widgetToggle)

  const counter = document.createElement('span')
  counter.id = 'widget-count'
  counter.style.marginLeft = 'auto'
  widgetPanel.appendChild(counter)

  const dropdown = document.createElement('div')
  dropdown.className = 'dropdown-content'
  widgetPanel.appendChild(dropdown)

  const serviceMenu = document.createElement('div')
  serviceMenu.className = 'dropdown'
  serviceMenu.dataset.testid = 'service-menu'
  serviceMenu.setAttribute('role', 'menu')

  const serviceContent = document.createElement('div')
  serviceContent.className = 'dropdown-content'

  const boardsItem = document.createElement('div')
  boardsItem.className = 'submenu'
  boardsItem.dataset.submenu = 'board'
  boardsItem.dataset.testid = 'menu-board'

  const boardTrigger = document.createElement('button')
  boardTrigger.className = 'submenu-trigger'
  boardTrigger.innerHTML = '\u25BC Board: <span data-role="label-board"></span>'
  boardsItem.appendChild(boardTrigger)

  const boardsMenu = document.createElement('div')
  boardsMenu.className = 'dropdown-content'
  boardsMenu.dataset.testid = 'submenu-boards'
  ;['create', 'rename', 'delete'].forEach(action => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.dataset.action = action
    btn.textContent = action.charAt(0).toUpperCase() + action.slice(1) +
      ' Board'
    boardsMenu.appendChild(btn)
  })
  boardsItem.appendChild(boardsMenu)

  const viewsItem = document.createElement('div')
  viewsItem.className = 'submenu'
  viewsItem.dataset.submenu = 'view'
  viewsItem.dataset.testid = 'menu-view'

  const viewTrigger = document.createElement('button')
  viewTrigger.className = 'submenu-trigger'
  viewTrigger.innerHTML = '\u25BC View: <span data-role="label-view"></span>'
  viewsItem.appendChild(viewTrigger)

  const viewsMenu = document.createElement('div')
  viewsMenu.className = 'dropdown-content'
  viewsMenu.dataset.testid = 'submenu-views'
  ;['create', 'rename', 'delete', 'reset'].forEach(action => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.dataset.action = action
    btn.textContent = action.charAt(0).toUpperCase() + action.slice(1) +
      ' View'
    viewsMenu.appendChild(btn)
  })
  viewsItem.appendChild(viewsMenu)

  serviceContent.appendChild(boardsItem)
  serviceContent.appendChild(viewsItem)
  serviceContent.appendChild(widgetPanel)

  serviceMenu.appendChild(serviceContent)
  serviceControl.appendChild(serviceMenu)

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
  resetButton.ariaLabel = 'Reset dashboard (keeps saved states)'
  resetButton.title = 'Reset dashboard (keeps saved states)'
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
  const settings = StorageManager.getConfig()?.globalSettings || {}
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
  const viewButtonMenu = document.getElementById('view-button-menu')
  if (viewButtonMenu) {
    viewButtonMenu.style.display = settings.views?.showViewOptionsAsButtons === true || settings.views?.showViewOptionsAsButtons === 'true' ? '' : 'none'
  }
}

export { initializeMainMenu, applyControlVisibility }
