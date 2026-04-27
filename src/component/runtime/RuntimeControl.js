// @ts-check
/**
 * Runtime control header tabs (Tasks/Shells/Processes).
 * @module runtime/RuntimeControl
 */

import { StorageManager } from '../../storage/StorageManager.js'
import {
  getRuntimeState,
  onRuntimeChange,
  setShells
} from './runtimeState.js'
import {
  listShellSessions,
  killShellSession,
  killAllShellSessions,
  attachUrlFor
} from './shellsClient.js'

/**
 * Mount runtime tabs in menu header.
 * @returns {{refresh: () => void}|null}
 */
export function mountRuntimeControl () {
  const root = /** @type {HTMLElement} */(document.getElementById('runtime-control'))
  if (!root) return null

  root.innerHTML = ''
  root.classList.add('runtime-control')

  const tabs = document.createElement('div')
  tabs.className = 'runtime-tabs'

  const panel = document.createElement('div')
  panel.className = 'runtime-panel'
  panel.hidden = true

  const tabDefs = [
    { key: 'tasks', label: 'Tasks' },
    { key: 'shells', label: 'Shells' },
    { key: 'processes', label: 'Processes' }
  ]

  /** @type {Record<string, HTMLButtonElement>} */
  const tabButtons = {}
  let activeTab = ''
  /** @type {((ev:MouseEvent) => void) | null} */
  let outsideClickHandler = null

  /**
   * Build panel content by active tab.
   * @param {'tasks'|'shells'|'processes'} key
   */
  const renderPanel = (key) => {
    const runtime = getRuntimeState()
    panel.innerHTML = ''

    const list = document.createElement('div')
    list.className = 'runtime-list'

    if (key === 'tasks') {
      const items = runtime.tasks
      if (!items.length) {
        list.textContent = 'No active tasks.'
      } else {
        for (const task of items) {
          const row = document.createElement('div')
          row.className = 'runtime-item'
          const statusText = String(task.status || 'running')
          const status = document.createElement('span')
          status.className = 'runtime-status'
          status.dataset.status = statusText
          status.textContent = statusText
          const title = document.createElement('span')
          title.className = 'runtime-title'
          title.textContent = String(task.title || task.id)
          const openBtn = document.createElement('button')
          openBtn.type = 'button'
          openBtn.textContent = 'Open'
          openBtn.className = 'runtime-open-btn'
          openBtn.disabled = typeof task.open !== 'function'
          openBtn.addEventListener('click', () => {
            if (typeof task.open === 'function') task.open()
          })
          row.append(status, title, openBtn)
          list.appendChild(row)
        }
      }
    } else if (key === 'shells') {
      // Header row with a "Kill all" action — only shown when there's
      // something to kill. Mirrors the `asd tmux kill-all` CLI command.
      if (runtime.shells.length) {
        const header = document.createElement('div')
        header.className = 'runtime-item runtime-item-header'
        const title = document.createElement('span')
        title.textContent = `${runtime.shells.length} session(s)`
        const killAll = document.createElement('button')
        killAll.type = 'button'
        killAll.className = 'runtime-action runtime-action-kill'
        killAll.dataset.testid = 'shells-kill-all'
        killAll.textContent = 'Kill all'
        killAll.addEventListener('click', async (ev) => {
          ev.stopPropagation()
          if (!confirm(`Kill all ${runtime.shells.length} asd-* tmux sessions?`)) return
          await killAllShellSessions()
          await refreshShells()
        })
        header.append(title, killAll)
        list.appendChild(header)
      }

      if (!runtime.shells.length) {
        list.textContent = 'No active asd-* tmux sessions.'
      } else {
        for (const shell of runtime.shells) {
          const id = String(shell.id || shell.name || '')
          if (!id) continue
          const row = document.createElement('div')
          row.className = 'runtime-item'
          row.dataset.shellId = id

          const label = document.createElement('span')
          label.className = 'runtime-title'
          label.textContent = id
          row.appendChild(label)

          // Attach: navigates the iframe (or top window if dashboard is
          // standalone) to ttyd with --target=<id> argv. The wrapper
          // re-attaches to the existing tmux session.
          const attachBtn = document.createElement('a')
          attachBtn.className = 'runtime-action'
          attachBtn.dataset.testid = `shells-attach-${id}`
          attachBtn.textContent = 'Attach'
          attachBtn.href = attachUrlFor(id)
          attachBtn.target = '_blank'
          attachBtn.rel = 'noopener'
          row.appendChild(attachBtn)

          // Kill: confirm, POST tmux.kill, re-fetch.
          const killBtn = document.createElement('button')
          killBtn.type = 'button'
          killBtn.className = 'runtime-action runtime-action-kill'
          killBtn.dataset.testid = `shells-kill-${id}`
          killBtn.textContent = 'Kill'
          killBtn.addEventListener('click', async (ev) => {
            ev.stopPropagation()
            if (!confirm(`Kill tmux session asd-${id}?`)) return
            killBtn.disabled = true
            const result = await killShellSession(id)
            if (!result.ok) {
              killBtn.disabled = false
              alert(`Failed to kill asd-${id}`)
              return
            }
            await refreshShells()
          })
          row.appendChild(killBtn)

          list.appendChild(row)
        }
      }
    } else {
      const items = (StorageManager.getServices() || []).map((svc) => ({
        id: svc.id,
        name: svc.name,
        state: svc.state || 'unknown',
        url: svc.url
      }))
      if (!items.length) {
        list.textContent = 'No processes discovered.'
      } else {
        for (const proc of items) {
          const row = document.createElement('div')
          row.className = 'runtime-item'
          const stateText = String(proc.state || 'unknown')
          const st = document.createElement('span')
          st.className = 'runtime-status'
          st.dataset.status = stateText === 'online' ? 'running' : stateText
          st.textContent = stateText
          const title = document.createElement('span')
          title.className = 'runtime-title'
          title.textContent = String(proc.name || proc.id || 'process')
          row.append(st, title)
          list.appendChild(row)
        }
      }
    }

    panel.appendChild(list)
  }

  const refresh = () => {
    const runtime = getRuntimeState()
    const processCount = (StorageManager.getServices() || []).length
    const counts = {
      tasks: runtime.tasks.length,
      // Show real session count — was previously `|| 1` to surface the
      // hardcoded "Default Shell" placeholder, which is gone now.
      shells: runtime.shells.length,
      processes: processCount
    }

    for (const def of tabDefs) {
      const btn = tabButtons[def.key]
      if (!btn) continue
      btn.textContent = `${def.label} (${counts[def.key]})`
    }

    if (activeTab) {
      renderPanel(/** @type {'tasks'|'shells'|'processes'} */ (activeTab))
    }
  }

  // Poll /asde/mcp/tmux.list while the Shells tab is open so the list and
  // the tab counter stay current as users open/close terminals elsewhere.
  /** @type {ReturnType<typeof setTimeout> | null} */
  let shellsPollTimer = null
  const SHELLS_POLL_INTERVAL_MS = 5000

  const refreshShells = async () => {
    const ids = await listShellSessions()
    setShells(ids.map((id) => ({ id, name: `asd-${id}` })))
  }

  const startShellsPoll = () => {
    if (shellsPollTimer) return
    refreshShells().catch(() => {})
    shellsPollTimer = setInterval(() => {
      refreshShells().catch(() => {})
    }, SHELLS_POLL_INTERVAL_MS)
  }

  const stopShellsPoll = () => {
    if (shellsPollTimer) {
      clearInterval(shellsPollTimer)
      shellsPollTimer = null
    }
  }

  for (const def of tabDefs) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'runtime-tab-btn'
    btn.dataset.runtimeTab = def.key
    btn.dataset.testid = `runtime-tab-${def.key}`
    btn.textContent = `${def.label} (0)`
    btn.addEventListener('click', () => {
      if (activeTab === def.key) {
        activeTab = ''
        panel.hidden = true
        for (const item of Object.values(tabButtons)) item.classList.remove('active')
        if (outsideClickHandler) {
          document.removeEventListener('click', outsideClickHandler)
          outsideClickHandler = null
        }
        stopShellsPoll()
        return
      }
      activeTab = def.key
      panel.hidden = false
      for (const [key, item] of Object.entries(tabButtons)) {
        item.classList.toggle('active', key === def.key)
      }
      // Switch poll on/off based on which tab is active. Shells tab does
      // its own ~5s refresh; other tabs don't need to hammer MCP.
      if (def.key === 'shells') startShellsPoll()
      else stopShellsPoll()
      renderPanel(/** @type {'tasks'|'shells'|'processes'} */ (def.key))
      if (!outsideClickHandler) {
        outsideClickHandler = (ev) => {
          const target = /** @type {Node | null} */ (ev.target)
          if (!target || !root.contains(target)) {
            activeTab = ''
            panel.hidden = true
            for (const item of Object.values(tabButtons)) item.classList.remove('active')
            stopShellsPoll()
            document.removeEventListener('click', outsideClickHandler)
            outsideClickHandler = null
          }
        }
        setTimeout(() => {
          if (outsideClickHandler) document.addEventListener('click', outsideClickHandler)
        }, 0)
      }
    })
    tabButtons[def.key] = btn
    tabs.appendChild(btn)
  }

  root.append(tabs, panel)
  onRuntimeChange(refresh)
  refresh()
  // Prime the tab counter even if the user never opens Shells — keeps the
  // header label honest when sessions exist before the dashboard loads.
  refreshShells().catch(() => {})

  return { refresh }
}
