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
import { DEFAULT_CONFIG_TEMPLATE } from '../../storage/defaultConfig.js'
import { exportConfig } from '../configModal/exportConfig.js'
import { openFragmentDecisionModal } from './fragmentDecisionModal.js'

/** @typedef {import('../../types.js').DashboardConfig} DashboardConfig */

const logger = new Logger('configModal.js')

/**
 * Open a modal dialog allowing the user to edit and save configuration JSON.
 *
 * @function openConfigModal
 * @returns {Promise<void>}
 */
export async function openConfigModal () {
  const storedConfig = StorageManager.getConfig()
  const configData = storedConfig || { ...DEFAULT_CONFIG_TEMPLATE }
  const last = StorageManager.misc.getItem('configModalTab') || 'cfgTab'

  openModal({
    id: 'config-modal',
    onCloseCallback: () => logger.log('Config modal closed'),
    buildContent: async (modal, closeModal) => {
      const tabsMeta = [
        {
          id: 'cfgTab',
          label: 'Configuration',
          contentFn: () => {
            const textarea = document.createElement('textarea')
            textarea.id = 'config-json'
            textarea.classList.add('modal__textarea--grow')
            textarea.value = JSON.stringify(configData, null, 2)
            return textarea
          }
        },
        {
          id: 'stateTab',
          label: 'Saved States',
          populate: populateStateTab
        }
      ]

      const tabButtons = {}
      const tabContents = {}
      const tabs = document.createElement('div')
      tabs.className = 'tabs'
      modal.appendChild(tabs)

      // Render tab buttons and containers
      for (const tab of tabsMeta) {
        const btn = document.createElement('button')
        btn.textContent = tab.label
        btn.dataset.tab = tab.id
        tabButtons[tab.id] = btn
        tabs.appendChild(btn)

        const div = document.createElement('div')
        div.id = tab.id
        div.style.display = 'none'
        tabContents[tab.id] = div

        if (tab.contentFn) div.appendChild(tab.contentFn())
        modal.appendChild(div)
      }

      const populatedTabs = new Set()

      const switchTab = async (tabId) => {
        for (const id in tabContents) {
          const isActive = id === tabId
          tabContents[id].style.display = isActive ? 'flex' : 'none'
          tabButtons[id].classList.toggle('active', isActive)
        }

        if (!populatedTabs.has(tabId)) {
          const tab = tabsMeta.find(t => t.id === tabId)
          if (tab?.populate) await tab.populate(tabContents[tabId])
          populatedTabs.add(tabId)
        }

        StorageManager.misc.setItem('configModalTab', tabId)
      }

      for (const id in tabButtons) {
        tabButtons[id].addEventListener('click', () => switchTab(id))
      }

      const saveButton = document.createElement('button')
      saveButton.textContent = 'Save'
      saveButton.classList.add('modal__btn', 'modal__btn--save')
      saveButton.addEventListener('click', () => {
        try {
          const textarea = /** @type {HTMLTextAreaElement} */(modal.querySelector('#config-json'))
          const cfg = JSON.parse(textarea.value)
          StorageManager.setConfig(cfg)
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

      await switchTab(last)
    }
  })
}

/**
 * Populate the saved states tab with stored snapshots.
 * @param {HTMLElement} tab
 * @returns {Promise<void>}
 */
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
  filter.placeholder = 'Filter snapshots...'
  filter.style.marginBottom = '0.5rem'
  filter.style.display = 'block'
  filter.style.width = '100%'
  tab.appendChild(filter)
  tab.classList.add('modal__tab--column')

  const table = document.createElement('table')
  const thead = document.createElement('thead')
  const tbody = document.createElement('tbody')

  const headers = ['Actions', '', 'Name', 'Type', 'Date', 'MD5']
  const headerRow = document.createElement('tr')
  headers.forEach(h => {
    const th = document.createElement('th')
    th.textContent = h
    headerRow.appendChild(th)
  })
  thead.appendChild(headerRow)
  table.append(thead, tbody)
  tab.appendChild(table)

  const wipeBtn = document.createElement('button')
  wipeBtn.textContent = 'Delete all snapshots'
  wipeBtn.ariaLabel = 'Delete all saved states'
  wipeBtn.title = 'Delete all saved states'
  wipeBtn.addEventListener('click', async () => {
    if (confirm('Delete all saved states? This cannot be undone.')) {
      await StorageManager.clearStateStore()
      list.splice(0, list.length)
      render()
    }
  })
  tab.appendChild(wipeBtn)

  /**
   * Render all saved state entries as table rows inside the tab's <tbody>.
   *
   * This function clears the existing table body and repopulates it using
   * the `list` of saved state snapshots. Each row includes buttons to:
   * - Restore a snapshot via `openFragmentDecisionModal()`
   * - Delete the snapshot and persist the new list
   *
   * Table rows are tagged with `data-name` for filtering via the search input.
   *
   * Side effects:
   * - Updates DOM inside <tbody>
   * - Binds event handlers to buttons in each row
   */
  function render () {
    tbody.innerHTML = ''
    list.forEach(row => {
      const tr = document.createElement('tr')
      tr.dataset.name = row.name

      const restore = document.createElement('button')
      restore.textContent = 'Restore'
      restore.addEventListener('click', async () => {
        try {
          await openFragmentDecisionModal({ cfgParam: row.cfg, svcParam: row.svc, nameParam: row.name })
        } catch (error) {
          logger.error('Error opening fragment decision modal:', error)
        }
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

      const cells = [
        restore,
        del,
        row.name,
        row.type,
        new Date(row.ts).toLocaleString(),
        row.md5
      ]

      cells.forEach(c => {
        const td = document.createElement('td')
        if (c instanceof HTMLElement) td.appendChild(c)
        else td.textContent = String(c)
        tr.appendChild(td)
      })

      tbody.appendChild(tr)
    })
  }

  filter.addEventListener('input', () => {
    const q = filter.value.toLowerCase()
    Array.from(tbody.children).forEach(el => {
      const row = /** @type {HTMLElement} */(el)
      const t = row.dataset.name || ''
      row.hidden = !t.toLowerCase().includes(q)
    })
  })

  render()
}
