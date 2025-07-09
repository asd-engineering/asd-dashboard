// @ts-check
/**
 * Modal dialog for editing the application configuration.
 *
 * @module configModal
 */
import { openModal } from './modalFactory.js'
import { showNotification } from '../dialog/notification.js'
import { Logger } from '../../utils/Logger.js'
import { clearConfigFragment } from '../../utils/fragmentGuard.js'
import StorageManager from '../../storage/StorageManager.js'
import { exportConfig } from '../configModal/exportConfig.js'
import { openFragmentDecisionModal } from './fragmentDecisionModal.js'

/** @typedef {import('../../types.js').DashboardConfig} DashboardConfig */

export const DEFAULT_CONFIG_TEMPLATE = {
  globalSettings: {
    theme: 'light',
    widgetStoreUrl: [],
    database: 'localStorage',
    hideBoardControl: false,
    hideViewControl: false,
    hideServiceControl: false,
    showMenuWidget: true,
    views: {
      showViewOptionsAsButtons: false,
      viewToShow: ''
    },
    localStorage: {
      enabled: 'true',
      loadDashboardFromConfig: 'true'
    }
  },
  boards: [],
  styling: {
    widget: { minColumns: 1, maxColumns: 8, minRows: 1, maxRows: 6 }
  }
}

const logger = new Logger('configModal.js')

/**
 * Open a modal dialog allowing the user to edit and save configuration JSON.
 *
 * @function openConfigModal
 * @returns {Promise<void>}
 */
export async function openConfigModal () {
  const storedConfig = StorageManager.getConfig()
  const storedBoards = StorageManager.getBoards()
  const configData = storedConfig || { ...DEFAULT_CONFIG_TEMPLATE }

  if (Array.isArray(storedBoards) && storedBoards.length > 0) {
    configData.boards = storedBoards
  }

  const last = StorageManager.misc.getItem('configModalTab') || 'cfg'
  openModal({
    id: 'config-modal',
    onCloseCallback: () => logger.log('Config modal closed'),
    buildContent: async (modal, closeModal) => {
      const tabs = document.createElement('div')
      tabs.className = 'tabs'
      const cfgBtn = document.createElement('button')
      cfgBtn.dataset.tab = 'cfg'
      cfgBtn.textContent = 'Configuration'
      const stateBtn = document.createElement('button')
      stateBtn.dataset.tab = 'state'
      stateBtn.textContent = 'Saved States'
      tabs.append(cfgBtn, stateBtn)
      modal.appendChild(tabs)

      const cfgTab = document.createElement('div')
      cfgTab.id = 'cfgTab'
      const textarea = document.createElement('textarea')
      textarea.id = 'config-json'
      textarea.classList.add('modal__textarea--grow')
      textarea.value = JSON.stringify(configData, null, 2)
      cfgTab.appendChild(textarea)
      modal.appendChild(cfgTab)

      const stateTab = document.createElement('div')
      stateTab.id = 'stateTab'
      stateTab.hidden = true
      modal.appendChild(stateTab)
      await populateStateTab(stateTab)

      const saveButton = document.createElement('button')
      saveButton.textContent = 'Save'
      saveButton.classList.add('modal__btn', 'modal__btn--save')

      saveButton.addEventListener('click', () => {
        try {
          const cfg = JSON.parse(textarea.value)

          // Be explicit about what you are saving
          StorageManager.setConfig(cfg)
          if (cfg.boards) {
            StorageManager.setBoards(cfg.boards)
          }

          showNotification('Config saved to localStorage')
          closeModal()
          clearConfigFragment()
          setTimeout(() => location.reload(), 500)
        } catch (e) {
          logger.error('Invalid JSON:', e)
          showNotification('Invalid JSON format', 3000, 'error')
        }
      })

      const exportButton = document.createElement('button')
      exportButton.textContent = 'Export'
      exportButton.title = 'Genereer deelbare URL'
      exportButton.classList.add('modal__btn', 'modal__btn--export')
      exportButton.addEventListener('click', exportConfig)

      const closeButton = document.createElement('button')
      closeButton.textContent = 'Close'
      closeButton.classList.add('modal__btn', 'modal__btn--cancel')
      closeButton.addEventListener('click', closeModal)

      const buttonContainer = document.createElement('div')
      buttonContainer.classList.add('modal__btn-group')
      buttonContainer.append(saveButton, exportButton, closeButton)
      modal.appendChild(buttonContainer)

      const switchTab = tab => {
        cfgBtn.classList.toggle('active', tab === 'cfg')
        stateBtn.classList.toggle('active', tab === 'state')
        cfgTab.hidden = tab !== 'cfg'
        stateTab.hidden = tab !== 'state'
        StorageManager.misc.setItem('configModalTab', tab)
      }
      cfgBtn.addEventListener('click', () => switchTab('cfg'))
      stateBtn.addEventListener('click', () => switchTab('state'))
      switchTab(last)
    }
  })
}

/**
 * Populate the saved states tab with stored snapshots.
 * @param {HTMLElement} tab
 * @returns {Promise<void>}
 */
async function populateStateTab (tab) {
  const store = await StorageManager.loadStateStore()
  const list = Array.isArray(store.states) ? store.states : []

  const filter = document.createElement('input')
  filter.id = 'stateFilter'
  tab.appendChild(filter)

  const table = document.createElement('table')
  const tbody = document.createElement('tbody')
  table.appendChild(tbody)
  tab.appendChild(table)

  /**
   * Render the saved states table rows.
   * @returns {void}
   */
  function render () {
    tbody.innerHTML = ''
    list.forEach(row => {
      const tr = document.createElement('tr')
      tr.dataset.name = row.name

      const restore = document.createElement('button')
      restore.textContent = 'Restore'
      restore.addEventListener('click', () => {
        openFragmentDecisionModal({ cfgParam: row.cfg, svcParam: row.svc, nameParam: row.name })
          .catch(error => {
            logger.error('Error opening fragment decision modal:', error)
          })
      })

      const del = document.createElement('button')
      del.textContent = 'Delete'
      del.addEventListener('click', async () => {
        if (confirm('Delete snapshot?')) {
          const idx = list.indexOf(row)
          if (idx !== -1) list.splice(idx, 1)
          await StorageManager.saveStateStore({ version: store.version, states: list })
          tr.remove()
        }
      })

      const cells = [restore, del, row.name, row.type, new Date(row.ts).toLocaleString(), row.md5]
      cells.forEach(c => {
        const td = document.createElement('td')
        if (c instanceof HTMLElement) td.appendChild(c)
        else td.textContent = String(c)
        tr.appendChild(td)
      })

      tbody.appendChild(tr)
    })
  }

  filter.addEventListener('keyup', () => {
    const q = filter.value.toLowerCase()
    Array.from(tbody.children).forEach(el => {
      const row = /** @type {HTMLElement} */(el)
      const t = row.dataset.name || ''
      row.hidden = !t.toLowerCase().includes(q)
    })
  })

  render()
}
