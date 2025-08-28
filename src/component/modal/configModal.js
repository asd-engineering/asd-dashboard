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
import { JsonForm } from '../utils/json-form.js'
import { DEFAULT_TEMPLATES, DEFAULT_PLACEHOLDERS } from '../utils/json-form-defaults.js'
import { isAdvancedMode, setAdvancedMode } from '../../state/uiState.js'
import { applyTheme, THEME } from '../../ui/theme.js'
import { autosaveIfPresent } from '../../storage/snapshots.js'
import { decodeConfig } from '../../utils/compression.js'
import { KEY_MAP } from '../../utils/fragmentKeyMap.js'
import { mergeBoards, mergeServices } from '../../utils/merge.js'
import { FRAG_DEFAULT_ALGO } from '../../utils/fragmentConstants.js'

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
  let configData = storedConfig || { ...DEFAULT_CONFIG_TEMPLATE }
  const last = StorageManager.misc.getItem('configModalTab') || 'cfgTab'
  let cfgForm, svcForm
  const advancedMode = isAdvancedMode()

  openModal({
    id: 'config-modal',
    onCloseCallback: () => logger.log('Config modal closed'),
    buildContent: async (modal, closeModal) => {
      const getVisibleConfig = () => advancedMode
        ? structuredClone(configData)
        : {
            globalSettings: structuredClone(configData.globalSettings),
            serviceTemplates: structuredClone(configData.serviceTemplates)
          }

      const tabsMeta = [
        {
          id: 'stateTab',
          label: 'Snapshots & Share',
          populate: populateStateTab
        },
        {
          id: 'cfgTab',
          label: 'Configuration',
          contentFn: () => {
            const wrap = document.createElement('div')
            wrap.classList.add('modal__tab--column')

            const toggle = document.createElement('button')
            toggle.textContent = 'JSON mode'
            toggle.classList.add('modal__btn', 'modal__btn--toggle', 'modal__toggle')

            const advLabel = document.createElement('label')
            advLabel.classList.add('modal__toggle')
            Object.assign(advLabel.style, { margin: '15px 0 0 15px', display: 'flex', alignItems: 'center', gap: '4px' })
            const advInput = document.createElement('input')
            advInput.type = 'checkbox'
            advInput.role = 'switch'
            advInput.ariaLabel = 'Advanced mode'
            advInput.dataset.testid = 'advanced-mode-toggle'
            advInput.checked = advancedMode
            advInput.addEventListener('change', () => {
              setAdvancedMode(advInput.checked)
              closeModal()
              openConfigModal().catch(() => {})
            })
            advLabel.append(advInput, document.createTextNode('Advanced mode'))

            const formDiv = document.createElement('div')
            formDiv.id = 'config-form'
            formDiv.classList.add('modal__jsonform')
            cfgForm = new JsonForm(formDiv, getVisibleConfig(), {
              topLevelTabs: {
                enabled: true,
                order: advancedMode
                  ? ['globalSettings', 'boards', 'serviceTemplates', 'styling']
                  : ['globalSettings', 'serviceTemplates']
              },
              templates: DEFAULT_TEMPLATES,
              placeholders: DEFAULT_PLACEHOLDERS
            })

            const setupThemeSelect = () => {
              const input = formDiv.querySelector('input[data-path="globalSettings.theme"]')
              if (!input) return
              const select = document.createElement('select')
              select.id = 'theme-select'
              ;[THEME.LIGHT, THEME.DARK].forEach(t => {
                const opt = document.createElement('option')
                opt.value = t
                opt.textContent = t.charAt(0).toUpperCase() + t.slice(1)
                select.appendChild(opt)
              })
              select.value = cfgForm.data.globalSettings?.theme || THEME.LIGHT
              select.addEventListener('change', () => {
                if (!cfgForm.data.globalSettings) cfgForm.data.globalSettings = {}
                cfgForm.data.globalSettings.theme = select.value
                applyTheme(select.value)
              })
              input.replaceWith(select)
            }

            setupThemeSelect()

            formDiv.addEventListener('click', e => {
              const target = /** @type {HTMLElement} */(e.target)
              const btn = target.closest('.jf-subtabs button')
              if (btn) setTimeout(setupThemeSelect)
            })

            const textarea = document.createElement('textarea')
            textarea.id = 'config-json'
            textarea.classList.add('modal__textarea--grow')
            textarea.style.display = 'none'
            textarea.value = JSON.stringify(configData, null, 2)

            toggle.addEventListener('click', () => {
              if (formDiv.style.display !== 'none') {
                const val = cfgForm.getValue()
                if (advancedMode) {
                  configData = val
                } else {
                  configData = { ...configData, ...val }
                }
                textarea.value = JSON.stringify(configData, null, 2)
                formDiv.style.display = 'none'
                textarea.style.display = 'block'
                toggle.textContent = 'Form mode'
              } else {
                try {
                  const parsed = JSON.parse(textarea.value)
                  configData = parsed
                  cfgForm.setValue(getVisibleConfig())
                  setupThemeSelect()
                  textarea.style.display = 'none'
                  formDiv.style.display = 'block'
                  toggle.textContent = 'JSON mode'
                } catch (e) {
                  showNotification('Invalid JSON format', 3000, 'error')
                }
              }
            })

            wrap.append(toggle, advLabel, formDiv, textarea)
            return wrap
          }
        },
        ...(advancedMode
          ? [{
              id: 'svcTab',
              label: 'Services',
              contentFn: () => {
                const wrap = document.createElement('div')
                wrap.classList.add('modal__tab--column')

                const toggle = document.createElement('button')
                toggle.textContent = 'JSON mode'
                toggle.classList.add('modal__btn', 'modal__btn--toggle', 'modal__toggle')

                const formDiv = document.createElement('div')
                formDiv.id = 'services-form'
                formDiv.classList.add('modal__jsonform', 'modal__textarea--grow')
                svcForm = new JsonForm(formDiv, StorageManager.getServices(), {
                  templates: DEFAULT_TEMPLATES,
                  placeholders: DEFAULT_PLACEHOLDERS,
                  rootPath: 'services'
                })

                const textarea = document.createElement('textarea')
                textarea.id = 'config-services'
                textarea.classList.add('modal__textarea--grow')
                textarea.style.display = 'none'
                textarea.value = JSON.stringify(StorageManager.getServices(), null, 2)

                toggle.addEventListener('click', () => {
                  if (formDiv.style.display !== 'none') {
                    const val = svcForm.getValue()
                    textarea.value = JSON.stringify(val, null, 2)
                    formDiv.style.display = 'none'
                    textarea.style.display = 'block'
                    toggle.textContent = 'Form mode'
                  } else {
                    try {
                      svcForm.setValue(JSON.parse(textarea.value))
                      textarea.style.display = 'none'
                      formDiv.style.display = 'block'
                      toggle.textContent = 'JSON mode'
                    } catch (e) {
                      showNotification('Invalid JSON format', 3000, 'error')
                    }
                  }
                })

                wrap.append(toggle, formDiv, textarea)
                return wrap
              }
            }]
          : [])
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
        /** @type {HTMLTextAreaElement|null} */
        const cfgEl = modal.querySelector('#config-json')
        /** @type {HTMLDivElement|null} */
        const cfgFormDiv = modal.querySelector('#config-form')
        /** @type {HTMLTextAreaElement|null} */
        const svcEl = modal.querySelector('#config-services')
        /** @type {HTMLDivElement|null} */
        const svcFormDiv = modal.querySelector('#services-form')
        let cfg, svc
        try {
          if (cfgFormDiv && cfgFormDiv.style.display !== 'none') {
            const val = cfgForm.getValue()
            if (advancedMode) {
              configData = val
            } else {
              configData = { ...configData, ...val }
            }
            cfg = configData
          } else {
            cfg = cfgEl ? JSON.parse(cfgEl.value) : {}
          }
        } catch (e) {
          logger.error('Invalid config JSON:', e)
          showNotification('Invalid config JSON format', 3000, 'error')
          return
        }
        try {
          if (svcFormDiv || svcEl) {
            svc = svcFormDiv && svcFormDiv.style.display !== 'none'
              ? svcForm.getValue()
              : svcEl ? JSON.parse(svcEl.value) : []
          } else {
            svc = StorageManager.getServices()
          }
        } catch (e) {
          logger.error('Invalid services JSON:', e)
          showNotification('Invalid services JSON format', 3000, 'error')
          return
        }
        StorageManager.setConfig(cfg)
        StorageManager.setServices(Array.isArray(svc) ? svc : StorageManager.getServices())
        showNotification('Config saved to localStorage')
        closeModal()
        clearConfigFragment()
        setTimeout(() => location.reload(), 500)
      })

      const exportButton = document.createElement('button')
      exportButton.textContent = 'Export'
      exportButton.title = 'Generate shareable URL'
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
async function populateStateTab (tab) {
  tab.innerHTML = ''
  tab.classList.add('modal__tab--column')

  const table = document.createElement('table')
  table.classList.add('table')
  table.innerHTML = `
    <thead>
      <tr>
        <th>Actions</th>
        <th>Name</th><th>Type</th><th>Date</th><th>MD5</th>
        <th>Size</th><th>Unique domains</th><th>Health</th>
      </tr>
    </thead>
    <tbody></tbody>
  `
  tab.appendChild(table)

  const actionsDiv = document.createElement('div')
  actionsDiv.classList.add('actions')
  const delAll = document.createElement('button')
  delAll.id = 'delete-all-snapshots'
  delAll.textContent = 'Delete all snapshots'
  actionsDiv.appendChild(delAll)
  tab.appendChild(actionsDiv)

  const tbody = table.querySelector('tbody')
  const store = await StorageManager.loadStateStore()
  const rows = Array.isArray(store.states) ? store.states : []

  for (const row of rows) {
    const tr = document.createElement('tr')
    const size = (row.cfg?.length || 0) + (row.svc?.length || 0)
    const uniqueDomains = await computeUniqueDomains(row.svc)
    const domainsTooltip = escapeHtml(Array.from(uniqueDomains).join(', '))

    tr.innerHTML = `
      <td>
        <button data-action="switch" data-id="${row.md5}">Switch</button>
        <button data-action="merge" data-id="${row.md5}">Merge into current</button>
        <button data-action="delete" data-id="${row.md5}">Delete</button>
      </td>
      <td>${escapeHtml(row.name || '')}</td>
      <td>${escapeHtml(row.type || '')}</td>
      <td>${new Date(row.ts || Date.now()).toLocaleString()}</td>
      <td><code>${row.md5 || ''}</code></td>
      <td>${size} bytes</td>
      <td title="${domainsTooltip}">${uniqueDomains.size}</td>
      <td><button data-action="health" data-id="${row.md5}">Healthcheck</button></td>
    `
    tbody.appendChild(tr)

    tr.querySelector('[data-action="switch"]')?.addEventListener('click', async () => {
      await applySnapshotSwitch(row)
    })
    tr.querySelector('[data-action="merge"]')?.addEventListener('click', async () => {
      await applySnapshotMerge(row)
    })
    tr.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
      if (!confirm(`Delete snapshot "${row.name}"?`)) return
      const idx = rows.indexOf(row)
      if (idx !== -1) rows.splice(idx, 1)
      await StorageManager.saveStateStore({ version: store.version, states: rows })
      await populateStateTab(tab)
    })
    tr.querySelector('[data-action="health"]')?.addEventListener('click', async () => {
      await runHealthcheck(row.svc)
    })
  }

  delAll.addEventListener('click', async () => {
    if (!confirm('Delete all saved snapshots?')) return
    await StorageManager.clearStateStore()
    await populateStateTab(tab)
  })
}

/**
 * Switch to the provided snapshot.
 * Autosaves current state before applying and reloading.
 * @param {{cfg?:string,svc?:string}} row
 * @returns {Promise<void>}
 */
async function applySnapshotSwitch (row) {
  try {
    await autosaveIfPresent()
    StorageManager.misc.setLastBoardId(null)
    StorageManager.misc.setLastViewId(null)

    const cfg = row.cfg ? await decodeSnapshot(row.cfg) : null
    const svc = row.svc ? await decodeSnapshot(row.svc) : null

    const nextCfg = cfg || { boards: [] }
    const nextSvc = Array.isArray(svc) ? svc : []

    StorageManager.setConfig(nextCfg)
    StorageManager.setServices(nextSvc)

    const firstBoardId = nextCfg?.boards?.[0]?.id || null
    const firstViewId = nextCfg?.boards?.[0]?.views?.[0]?.id || null
    StorageManager.misc.setLastBoardId(firstBoardId)
    StorageManager.misc.setLastViewId(firstViewId)

    window.location.reload()
  } catch (e) {
    logger.error('snapshot.switch.failed', e)
    alert('Failed to switch snapshot')
  }
}

/**
 * Merge snapshot payloads into current live state.
 * @param {{cfg?:string,svc?:string}} row
 * @returns {Promise<void>}
 */
async function applySnapshotMerge (row) {
  try {
    await autosaveIfPresent()
    const incomingCfg = row.cfg ? await decodeSnapshot(row.cfg) : null
    const incomingSvc = row.svc ? await decodeSnapshot(row.svc) : null
    const currentCfg = StorageManager.getConfig() || { boards: [] }
    const currentSvc = StorageManager.getServices() || []

    const mergedCfg = incomingCfg ? { ...currentCfg, boards: mergeBoards(currentCfg.boards || [], incomingCfg.boards || []) } : currentCfg
    const mergedSvc = incomingSvc ? mergeServices(currentSvc, incomingSvc) : currentSvc

    StorageManager.setConfig(mergedCfg)
    StorageManager.setServices(mergedSvc)

    const firstBoardId = mergedCfg?.boards?.[0]?.id || null
    const firstViewId = mergedCfg?.boards?.[0]?.views?.[0]?.id || null
    StorageManager.misc.setLastBoardId(firstBoardId)
    StorageManager.misc.setLastViewId(firstViewId)

    window.location.reload()
  } catch (e) {
    logger.error('snapshot.merge.failed', e)
    alert('Failed to merge snapshot')
  }
}

/**
 * Decode an encoded snapshot string using supported algorithms.
 * @param {string} str
 * @returns {Promise<any>}
 */
async function decodeSnapshot (str) {
  try {
    return await decodeConfig(str, { algo: FRAG_DEFAULT_ALGO, keyMap: KEY_MAP, expectChecksum: null })
  } catch {
    try {
      return await decodeConfig(str, { algo: 'gzip', keyMap: KEY_MAP, expectChecksum: null })
    } catch {
      return null
    }
  }
}

/**
 * Compute unique service hostnames from encoded services payload.
 * @param {string} svcEnc
 * @returns {Promise<Set<string>>}
 */
async function computeUniqueDomains (svcEnc) {
  const set = new Set()
  if (!svcEnc) return set
  try {
    const svc = await decodeSnapshot(svcEnc)
    if (Array.isArray(svc)) {
      svc.forEach(s => {
        try {
          if (s && s.url) set.add(new URL(s.url).hostname)
        } catch {}
      })
    }
  } catch {}
  return set
}

/**
 * Run HEAD requests against encoded service URLs and display a summary.
 * Caps concurrency and ignores CORS errors.
 * @param {string} svcEnc
 * @returns {Promise<{ok:number,fail:number,unknown:number}>}
 */
async function runHealthcheck (svcEnc) {
  const res = { ok: 0, fail: 0, unknown: 0 }
  if (!svcEnc) return res
  try {
    const svc = await decodeSnapshot(svcEnc)
    const urls = (Array.isArray(svc) ? svc : []).map(s => (s && typeof s.url === 'string') ? s.url : '').filter(Boolean)
    const unique = Array.from(new Set(urls))
    const concurrency = 4
    const queue = unique.slice()
    const worker = async () => {
      while (queue.length) {
        const u = queue.shift()
        if (!u) break
        try {
          const ctrl = new AbortController()
          const to = setTimeout(() => ctrl.abort(), 2000)
          const r = await fetch(u, { method: 'HEAD', mode: 'no-cors', signal: ctrl.signal })
          clearTimeout(to)
          if (r.type === 'opaque') res.unknown++
          else if (r.ok) res.ok++
          else res.fail++
        } catch {
          res.fail++
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker))
  } catch {}
  showNotification(`Healthcheck: ${res.ok} OK, ${res.fail} FAIL, ${res.unknown} UNKNOWN`)
  return res
}

/**
 * Escape HTML entities in a string.
 * @param {string} s
 * @returns {string}
 */
function escapeHtml (s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
