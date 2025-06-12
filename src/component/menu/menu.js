import emojiList from '../../ui/unicodeEmoji.js'

function initSW () {
  const swToggle = document.getElementById('sw-toggle')
  const swIcon = document.querySelector('.sw-icon')
  const swCheckbox = document.querySelector('.icon-checkbox')
  const swEnabled = localStorage.getItem('swEnabled') === 'true'
  swToggle.checked = swEnabled

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
    function registerServiceWorker () {
      navigator.serviceWorker.register('/serviceWorker.js', { scope: '/' })
        .then(function (registration) {
          console.log('Service Worker registered with scope:', registration.scope)
        })
        .catch(function (error) {
          console.error('Service Worker registration failed:', error)
        })
    }

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
      localStorage.setItem('swEnabled', isEnabled)
      updateServiceWorkerUI(isEnabled)

      if (isEnabled) {
        registerServiceWorker()
      } else {
        unregisterServiceWorker()
      }
    })
  }
}

export function initializeMainMenu () {
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

  const resetButton = document.createElement('button')
  resetButton.id = 'reset-button'
  resetButton.textContent = 'Reset'
  serviceControl.appendChild(resetButton)

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

  menu.appendChild(adminControl)

  document.body.insertBefore(menu, document.body.firstChild) // Append as the first child
  initSW()
}
