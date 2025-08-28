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

      // New "Delete all snapshots" button
      const delAll = document.createElement('button')
      delAll.id = 'delete-all-snapshots'
      delAll.textContent = 'Delete all snapshots'
      delAll.setAttribute('aria-label', 'Delete all saved snapshots')
      delAll.classList.add('modal__btn', 'modal__btn--danger')
      delAll.addEventListener('click', async () => {
        if (!confirm('Delete all saved snapshots?')) return
        await StorageManager.clearStateStore()

        const stateTab = document.getElementById('stateTab')
        if (stateTab) await populateStateTab(stateTab)
        showNotification('All snapshots deleted')
      })

      const closeButton = document.createElement('button')
      closeButton.textContent = 'Close'
      closeButton.classList.add('modal__btn', 'modal__btn--cancel')
      closeButton.addEventListener('click', closeModal)

      const buttonContainer = document.createElement('div')
      buttonContainer.classList.add('modal__btn-group')
      // Order: Save, Export, Delete all snapshots, Close
      buttonContainer.append(saveButton, exportButton, delAll, closeButton)
      modal.appendChild(buttonContainer)

      await switchTab(last)
    }
  })
}

/**
 * Populate the saved states tab with stored snapshots.
 * Rows stay compact; a collapsible sibling <tr> shows detailed domain chips.
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

  const tbody = table.querySelector('tbody')
  const store = await StorageManager.loadStateStore()
  const rows = Array.isArray(store.states) ? store.states : []
  const colCount = table.querySelectorAll('thead th').length || 8

  for (const row of rows) {
    const tr = document.createElement('tr')
    const size = (row.cfg?.length || 0) + (row.svc?.length || 0)
    const uniqueDomains = await computeUniqueDomains(row.svc)
    const domainsTooltip = escapeHtml(Array.from(uniqueDomains).join(', '))

    tr.innerHTML = `
      <td class="hc-actions">
        <button data-action="switch" data-id="${row.md5}">Switch</button>
        <button data-action="merge" data-id="${row.md5}">Merge into current</button>
        <button data-action="delete" data-id="${row.md5}">Delete</button>
      </td>
      <td>${escapeHtml(row.name || '')}</td>
      <td>${escapeHtml(row.type || '')}</td>
      <td>${new Date(row.ts || Date.now()).toLocaleString()}</td>
      <td><code>${row.md5 || ''}</code></td>
      <td>${size} bytes</td>
      <td class="hc-domains" title="${domainsTooltip}">
        <span class="hc-domains-count">${uniqueDomains.size}</span>
      </td>
      <td class="hc-health">
        <span class="hc-summary" aria-live="polite" aria-atomic="true">
          <span class="hc-dot muted"></span>
          <span class="hc-summary-text">not checked</span>
        </span>
        <button class="hc-btn" data-action="health" data-id="${row.md5}">Healthcheck</button>
        <button class="hc-btn" data-action="toggle" data-id="${row.md5}" disabled>Details</button>
      </td>
    `
    tbody.appendChild(tr)

    // Collapsible details row (initially hidden)
    const detailsTr = document.createElement('tr')
    detailsTr.className = 'hc-details-row'
    detailsTr.style.display = 'none'
    detailsTr.innerHTML = `
      <td colspan="${colCount}">
        <div class="hc-panel">
          <div class="hc-list"></div>
        </div>
      </td>
    `
    tr.insertAdjacentElement('afterend', detailsTr)

    // Element refs
    const domainsCell = /** @type {HTMLTableCellElement} */ (tr.querySelector('.hc-domains'))
    const summaryDotEl = /** @type {HTMLSpanElement} */ (tr.querySelector('.hc-summary .hc-dot'))
    const summaryTextEl = /** @type {HTMLSpanElement} */ (tr.querySelector('.hc-summary-text'))
    const listEl = /** @type {HTMLDivElement} */ (detailsTr.querySelector('.hc-list'))
    const toggleBtn = /** @type {HTMLButtonElement} */ (tr.querySelector('[data-action="toggle"]'))
    const healthBtn = /** @type {HTMLButtonElement} */ (tr.querySelector('[data-action="health"]'))

    // Row action handlers
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

    toggleBtn.addEventListener('click', () => {
      const open = detailsTr.style.display !== 'none'
      detailsTr.style.display = open ? 'none' : ''
      toggleBtn.textContent = open ? 'Details' : 'Hide'
    })

    healthBtn.addEventListener('click', async () => {
      healthBtn.disabled = true
      healthBtn.textContent = 'Checking…'
      listEl.innerHTML = '' // clear details
      try {
        const result = await runHealthcheck(row.svc, {
          notify: false,
          onProgress: (p) => {
            renderHealthUI(summaryTextEl, summaryDotEl, domainsCell, listEl, p.byDomain, p.totals.checkedAt, uniqueDomains)
          }
        })
        renderHealthUI(summaryTextEl, summaryDotEl, domainsCell, listEl, result.byDomain, result.checkedAt, uniqueDomains)
        toggleBtn.disabled = false
        toggleBtn.textContent = 'Details'
        detailsTr.style.display = '' // auto-open once after first run
      } catch {
        summaryTextEl.textContent = 'error'
        summaryDotEl.className = 'hc-dot down'
      } finally {
        healthBtn.disabled = false
        healthBtn.textContent = 'Re-run'
      }
    })

    // Initial compact render
    renderHealthUI(summaryTextEl, summaryDotEl, domainsCell, listEl, {}, undefined, uniqueDomains)
  }
}


/**
 * Render per-domain health results into the table cells.
 * @param {HTMLDivElement} listEl Container for the badges (inside "Health" column).
 * @param {HTMLSpanElement} metaEl Small meta line (inside "Health" column).
 * @param {HTMLTableCellElement} domainsCell "Unique domains" cell to update counts/tooltip.
 * @param {Record<string, import('./configModal.js').DomainInfo>} byDomain Map domain -> stats.
 * @param {number} [checkedAt] Epoch ms when last update happened.
 * @param {Set<string>} [initialUnique] Optional precomputed unique domains for initial render.
 */
function renderHealthCells (listEl, metaEl, domainsCell, byDomain, checkedAt, initialUnique) {
  // Compute aggregates
  const domains = initialUnique ? Array.from(initialUnique) : Object.keys(byDomain || {})
  const up = domains.filter(d => (byDomain?.[d]?.status || 'down') === 'up').length
  const down = domains.filter(d => (byDomain?.[d]?.status || 'down') === 'down').length
  const partial = domains.filter(d => (byDomain?.[d]?.status || 'down') === 'partial').length

  // Update "Unique domains" cell
  const countEl = domainsCell.querySelector('.hc-domains-count')
  if (countEl) countEl.textContent = String(domains.length || 0)
  const tooltip = domains.map(d => `${d} : ${byDomain?.[d]?.status || 'unknown'}`).join(', ')
  domainsCell.title = tooltip || 'No domains'
  // Show small summary next to count
  const summary = domainsCell.querySelector('.hc-muted')
  if (summary) {
    summary.textContent = domains.length
      ? `(${up} up / ${down} down${partial ? ` / ${partial} partial` : ''})`
      : '(no domains)'
  }

  // Render the badge list inside "Health" column
  listEl.innerHTML = ''
  if (domains.length) {
    for (const d of domains) {
      const info = byDomain?.[d]
      const st = info?.status || 'down'
      const badge = document.createElement('span')
      badge.className = 'hc-item'
      const dot = document.createElement('span')
      dot.className = `hc-dot ${st === 'up' ? 'hc-up' : st === 'partial' ? 'hc-partial' : 'hc-down'}`
      const text = document.createElement('span')
      text.textContent = info ? `${d} (${info.up}/${info.total})` : `${d} (0/0)`
      badge.append(dot, text)
      listEl.appendChild(badge)
    }
  }

  // Meta line
  metaEl.textContent = domains.length
    ? `Last checked ${checkedAt ? new Date(checkedAt).toLocaleString() : ''}`
    : 'No domains'
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
 * @typedef {'up'|'down'|'partial'} DomainStatus
 */

/**
 * Per-domain counters and status.
 * @typedef {Object} DomainInfo
 * @property {number} up    Number of successful probes for this domain.
 * @property {number} down  Number of failed probes for this domain.
 * @property {number} total Total probes for this domain.
 * @property {DomainStatus} status Aggregated domain status.
 */

/**
 * Result object returned by runHealthcheck.
 * @typedef {Object} HealthcheckResult
 * @property {number} ok
 * @property {number} fail
 * @property {number} unknown
 * @property {Record<string, DomainInfo>} byDomain
 * @property {number} checkedAt Epoch milliseconds when finished.
 */

/**
 * Progress payload emitted per URL.
 * @typedef {Object} HealthcheckProgress
 * @property {string} url
 * @property {string} domain
 * @property {'ok'|'fail'} verdict
 * @property {{ ok:number, fail:number, unknown:number, checkedAt:number }} totals
 * @property {Record<string, DomainInfo>} byDomain
 */

/**
 * Health-check a list of URLs from the browser.
 * "Reachable" means: the browser could reach the origin over the network,
 * regardless of HTTP status or CORS. Only network/mixed-content/timeout errors count as FAIL.
 *
 * Expects svcEnc to decode to an array of { url: string }.
 *
 * @param {string} svcEnc Encoded services payload.
 * @param {{
 *   concurrency?: number,
 *   timeoutMs?: number,
 *   notify?: boolean,
 *   onProgress?: (p: HealthcheckProgress) => void
 * }} [opts] Optional execution settings.
 * @returns {Promise<HealthcheckResult>} Aggregate result counters + per-domain details.
 */
async function runHealthcheck (svcEnc, { concurrency = 4, timeoutMs = 5000, notify = true, onProgress } = {}) {
  /** @type {HealthcheckResult} */
  const res = { ok: 0, fail: 0, unknown: 0, byDomain: Object.create(null), checkedAt: Date.now() }
  if (!svcEnc) return res

  // --- helpers --------------------------------------------------------------

  /**
   * Decode the encoded services payload to an array.
   * Returns an empty array when decoding fails or the payload is not an array.
   * @param {string} enc Encoded services payload.
   * @returns {Promise<Array<{url?: string}>>} Decoded services array or [].
   */
  async function decodeOrArray (enc) {
    try {
      const svc = await decodeSnapshot(enc)
      return Array.isArray(svc) ? svc : []
    } catch {
      return []
    }
  }

  /**
   * Extract unique, non-empty URL strings from service-like items.
   * @param {Array<{url?: string}>} items Services list with optional `url` fields.
   * @returns {string[]} Unique URL list.
   */
  function uniqueUrls (items) {
    const urls = items
      .map(s => (s && typeof s.url === 'string') ? s.url.trim() : '')
      .filter(Boolean)
    return Array.from(new Set(urls))
  }

  /**
   * @param {(signal: AbortSignal) => Promise<Response>} promiseFactory
   * @param {number} ms
   * @returns {Promise<Response>}
   */
  function withTimeout (promiseFactory, ms) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), ms)
    const p = promiseFactory(ctrl.signal).finally(() => clearTimeout(timer))
    return p
  }

  /**
   * @param {string} url
   * @param {number} timeout
   * @returns {Promise<Response>}
   */
  async function tryCorsHead (url, timeout) {
    return withTimeout(
      signal => fetch(url, {
        method: 'HEAD',
        mode: 'cors',
        redirect: 'follow',
        credentials: 'omit',
        cache: 'no-store',
        signal
      }),
      timeout
    )
  }

  /**
   * @param {string} url
   * @param {number} timeout
   * @returns {Promise<Response>}
   */
  async function tryNoCorsGet (url, timeout) {
    return withTimeout(
      signal => fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        redirect: 'follow',
        credentials: 'omit',
        cache: 'no-store',
        signal
      }),
      timeout
    )
  }

  /**
   * When the page is https and the target is http, return an https-upgraded URL.
   * @param {string} url
   * @returns {string|null}
   */
  function maybeUpgradeToHttps (url) {
    try {
      const u = new URL(url, window.location.href)
      const pageIsHttps = typeof window !== 'undefined' && window.location && window.location.protocol === 'https:'
      if (pageIsHttps && u.protocol === 'http:') {
        u.protocol = 'https:'
        return u.toString()
      }
    } catch {}
    return null
  }

  /**
   * @param {string} url
   * @returns {Promise<'ok'|'fail'>}
   */
  async function probe (url) {
    try {
      const r = await tryCorsHead(url, timeoutMs)
      if (r instanceof Response) return 'ok'
    } catch {
      const upgraded = maybeUpgradeToHttps(url)
      if (upgraded) {
        try {
          const r2 = await tryCorsHead(upgraded, timeoutMs)
          if (r2 instanceof Response) return 'ok'
        } catch {}
      }
    }
    try {
      const r3 = await tryNoCorsGet(url, timeoutMs)
      if (r3 instanceof Response) return 'ok'
    } catch {}
    return 'fail'
  }

  /**
   * Update per-domain counters and aggregate status.
   * @param {string} domain
   * @param {'ok'|'fail'} verdict
   */
  function bumpDomain (domain, verdict) {
    if (!domain) return
    const d = res.byDomain[domain] || (res.byDomain[domain] = { up: 0, down: 0, total: 0, status: 'down' })
    if (verdict === 'ok') d.up += 1
    else d.down += 1
    d.total += 1
    d.status = d.up > 0 && d.down === 0
      ? 'up'
      : (d.up > 0 && d.down > 0 ? 'partial' : 'down')
  }

  // --- worker pool ----------------------------------------------------------

  try {
    const items = await decodeOrArray(svcEnc)
    const queue = uniqueUrls(items)
    if (!queue.length) {
      if (notify) showNotification(`Healthcheck: ${res.ok} OK, ${res.fail} FAIL, ${res.unknown} UNKNOWN`)
      return res
    }

    const q = queue.slice()
    /**
     * @returns {Promise<void>}
     */
    async function worker () {
      while (q.length) {
        const url = q.shift()
        if (!url) break
        const domain = (() => { try { return new URL(url).hostname } catch { return '' } })()
        try {
          const verdict = await probe(url)
          if (verdict === 'ok') res.ok++
          else res.fail++
          bumpDomain(domain, verdict)
        } catch {
          res.fail++
          bumpDomain(domain, 'fail')
        } finally {
          res.checkedAt = Date.now()
          onProgress?.({
            url,
            domain,
            verdict: res.byDomain[domain]?.up ? 'ok' : 'fail',
            totals: { ok: res.ok, fail: res.fail, unknown: res.unknown, checkedAt: res.checkedAt },
            byDomain: res.byDomain
          })
        }
      }
    }

    const n = Math.min(concurrency, queue.length)
    await Promise.all(Array.from({ length: n }, () => worker()))
  } catch {}

  if (notify) showNotification(`Healthcheck: ${res.ok} OK, ${res.fail} FAIL, ${res.unknown} UNKNOWN`)
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

/**
 * Render compact summary + optional expanded panel for health results.
 * Keeps table cells narrow; details live in a sibling <tr> that spans all columns.
 *
 * @param {HTMLSpanElement} summaryTextEl  Inline summary text element in the cell.
 * @param {HTMLSpanElement} summaryDotEl   Inline status dot element in the cell.
 * @param {HTMLTableCellElement} domainsCell  "Unique domains" cell to update count/tooltip.
 * @param {HTMLDivElement} panelListEl     Container inside the expanded panel for chips.
 * @param {Record<string, {up:number,down:number,total:number,status:'up'|'down'|'partial'}>} byDomain
 * @param {number} [checkedAt]
 * @param {Set<string>} [initialUnique]
 */
function renderHealthUI (summaryTextEl, summaryDotEl, domainsCell, panelListEl, byDomain, checkedAt, initialUnique) {
  const domains = initialUnique ? Array.from(initialUnique) : Object.keys(byDomain || {})
  let up = 0, down = 0, partial = 0
  for (const d of domains) {
    const st = byDomain?.[d]?.status || 'down'
    if (st === 'up') up++
    else if (st === 'partial') partial++
    else down++
  }

  // --- Compact summary in the cell -----------------------------------------
  summaryTextEl.textContent = domains.length
    ? `${up}/${domains.length} up${partial ? ` (${partial} partial)` : ''}`
    : '—'
  summaryDotEl.className = `hc-dot ${up === domains.length ? 'up' : (up > 0 ? 'partial' : 'down')}`

  // --- Update "Unique domains" count + tooltip ------------------------------
  const countEl = domainsCell.querySelector('.hc-domains-count')
  if (countEl) countEl.textContent = String(domains.length || 0)
  domainsCell.title = domains.map(d => `${d} : ${byDomain?.[d]?.status || 'unknown'}`).join(', ') || 'No domains'

  // --- Expanded panel chips -------------------------------------------------
  if (panelListEl) {
    panelListEl.innerHTML = ''
    for (const d of domains) {
      const info = byDomain?.[d]
      const st = info?.status || 'down'
      const chip = document.createElement('span')
      chip.className = 'hc-chip'
      const dot = document.createElement('span')
      dot.className = `hc-dot ${st === 'up' ? 'up' : st === 'partial' ? 'partial' : 'down'}`
      const text = document.createElement('span')
      text.textContent = info ? `${d} (${info.up}/${info.total})` : `${d} (0/0)`
      chip.append(dot, text)
      panelListEl.appendChild(chip)
    }
    if (domains.length) {
      const meta = document.createElement('div')
      meta.className = 'hc-meta-line'
      meta.textContent = `Last checked ${checkedAt ? new Date(checkedAt).toLocaleString() : ''}`
      panelListEl.prepend(meta)
    }
  }
}

