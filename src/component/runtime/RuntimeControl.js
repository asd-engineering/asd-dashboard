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
  attachUrlFor,
  newShellUrl
} from './shellsClient.js'
import { openModal } from '../modal/modalFactory.js'
import { showNotification } from '../dialog/notification.js'

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
      renderShellsPanel(list)
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

  // ── Shells panel state ─────────────────────────────────────────
  // Local state co-located with the closure that owns the panel. Kept
  // out of runtimeState.js because nothing else in the dashboard needs
  // it — runtime.shells is just the list of session ids for rendering.

  /** Last result from listShellSessions(); 'unknown' until first poll. */
  let shellsStatus = /** @type {'unknown'|'ok'|'error'} */ ('unknown')
  /** Last error reason, when shellsStatus === 'error'. */
  let shellsErrorReason = ''
  /**
   * Sessions we've optimistically removed via Kill but haven't been
   * confirmed by a subsequent poll. Used by refreshShells() to suppress
   * a momentary re-introduction caused by an in-flight poll that was
   * already mid-flight when Kill fired (race A6 in the proposal).
   * Entries auto-clear when the next poll confirms the absence.
   * @type {Set<string>}
   */
  const inFlightKills = new Set()
  /** Per-row "are you sure" pending state — id → row element. */
  /** @type {Map<string, HTMLElement>} */
  const pendingConfirm = new Map()

  /**
   * Open ttyd in an in-page modal iframe instead of `_blank`. Mirrors the
   * service-action modal's UX so users keep dashboard context. The modal
   * is borrowed via openModal() rather than reimplemented.
   * @param {{title: string, url: string}} opts
   */
  const openTerminalModal = (opts) => {
    openModal({
      id: `shells-terminal-${Date.now()}`,
      buildContent: (modal) => {
        modal.classList.add('service-action-modal')
        const header = document.createElement('h3')
        header.className = 'service-action-header'
        header.textContent = opts.title
        modal.appendChild(header)

        const iframe = document.createElement('iframe')
        iframe.src = opts.url
        iframe.className = 'service-action-iframe'
        iframe.dataset.testid = 'shells-terminal-iframe'
        modal.appendChild(iframe)
      }
    })
  }

  /**
   * Map errorReason → user-readable text.
   * @param {string} reason
   * @returns {string}
   */
  const errorBannerText = (reason) => {
    switch (reason) {
      case 'unauthorized': return 'Session expired — refresh to log back in.'
      case 'network': return 'MCP unreachable — check the hub is up.'
      case 'parse': return 'MCP returned an unexpected response.'
      default: return 'MCP returned an error — see console for details.'
    }
  }

  /**
   * Build the Shells panel inside the given list element.
   * @param {HTMLElement} list
   */
  function renderShellsPanel (list) {
    // Error banner takes precedence when MCP is unreachable. Hides the
    // empty-state copy that would otherwise look like "everything's fine,
    // there's just nothing here" and confuse the user (A5/C4).
    if (shellsStatus === 'error') {
      const banner = document.createElement('div')
      banner.className = 'runtime-item runtime-banner-error'
      banner.dataset.testid = 'shells-error-banner'
      banner.textContent = errorBannerText(shellsErrorReason)
      list.appendChild(banner)
    }

    // "+ New Shell" row — always present so users can spin up a fresh
    // tmux session without going hunting for the terminal URL (C5).
    const newRow = document.createElement('div')
    newRow.className = 'runtime-item runtime-item-action'
    const newBtn = document.createElement('button')
    newBtn.type = 'button'
    newBtn.className = 'runtime-action runtime-action-primary'
    newBtn.dataset.testid = 'shells-new'
    newBtn.textContent = '+ New Shell'
    newBtn.addEventListener('click', (ev) => {
      ev.stopPropagation()
      const { url, sessionId } = newShellUrl()
      openTerminalModal({ title: `New shell: asd-${sessionId}`, url })
      // The shell exists once ttyd's wrapper boots tmux. Kick a refresh
      // shortly after so the new session shows up without waiting a full
      // poll cycle.
      setTimeout(() => { refreshShells().catch(() => {}) }, 800)
    })
    newRow.appendChild(newBtn)
    list.appendChild(newRow)

    // Kill-all only when there are surviving sessions.
    const shellsNow = getRuntimeState().shells
    const visible = shellsNow.filter(
      (s) => !inFlightKills.has(String(s.id || ''))
    )
    if (visible.length) {
      const header = document.createElement('div')
      header.className = 'runtime-item runtime-item-header'
      const title = document.createElement('span')
      title.textContent = `${visible.length} session(s)`
      const killAll = document.createElement('button')
      killAll.type = 'button'
      killAll.className = 'runtime-action runtime-action-kill'
      killAll.dataset.testid = 'shells-kill-all'
      killAll.textContent = 'Kill all'
      // Two-step inline confirm (C3): first click flips the button into a
      // "Confirm" / "Cancel" pair; second click in 5s does the kill.
      killAll.addEventListener('click', (ev) => {
        ev.stopPropagation()
        confirmKillAll(killAll, header)
      })
      header.append(title, killAll)
      list.appendChild(header)
    }

    if (shellsStatus === 'ok' && !visible.length) {
      const empty = document.createElement('div')
      empty.className = 'runtime-empty'
      empty.dataset.testid = 'shells-empty'
      empty.textContent =
        'No shells running. Click + New Shell, or use Start on a service to open one.'
      list.appendChild(empty)
      return
    }
    if (shellsStatus === 'unknown' && !visible.length) {
      const loading = document.createElement('div')
      loading.className = 'runtime-empty'
      loading.dataset.testid = 'shells-loading'
      loading.textContent = 'Loading sessions…'
      list.appendChild(loading)
      return
    }

    for (const shell of visible) {
      const id = String(shell.id || shell.name || '')
      if (!id) continue
      const row = document.createElement('div')
      row.className = 'runtime-item'
      row.dataset.shellId = id

      const label = document.createElement('span')
      label.className = 'runtime-title'
      label.textContent = `asd-${id}`
      row.appendChild(label)

      const attachBtn = document.createElement('button')
      attachBtn.type = 'button'
      attachBtn.className = 'runtime-action'
      attachBtn.dataset.testid = `shells-attach-${id}`
      attachBtn.textContent = 'Attach'
      attachBtn.addEventListener('click', (ev) => {
        ev.stopPropagation()
        openTerminalModal({ title: `Attach: asd-${id}`, url: attachUrlFor(id) })
      })
      row.appendChild(attachBtn)

      const killBtn = document.createElement('button')
      killBtn.type = 'button'
      killBtn.className = 'runtime-action runtime-action-kill'
      killBtn.dataset.testid = `shells-kill-${id}`
      killBtn.textContent = 'Kill'
      killBtn.addEventListener('click', (ev) => {
        ev.stopPropagation()
        confirmKillOne(id, killBtn, row)
      })
      row.appendChild(killBtn)

      list.appendChild(row)
    }
  }

  /**
   * Two-step confirmation for killing a single session. First click swaps
   * the button into a Confirm/Cancel pair; the Confirm action does the
   * actual kill with optimistic UI removal.
   * @param {string} id
   * @param {HTMLButtonElement} killBtn
   * @param {HTMLElement} row
   */
  function confirmKillOne (id, killBtn, row) {
    if (pendingConfirm.has(id)) return
    pendingConfirm.set(id, row)

    const original = killBtn.textContent
    killBtn.style.display = 'none'

    const confirmBtn = document.createElement('button')
    confirmBtn.type = 'button'
    confirmBtn.className = 'runtime-action runtime-action-kill'
    confirmBtn.dataset.testid = `shells-kill-confirm-${id}`
    confirmBtn.textContent = 'Confirm'

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'runtime-action'
    cancelBtn.dataset.testid = `shells-kill-cancel-${id}`
    cancelBtn.textContent = 'Cancel'

    const cleanup = () => {
      pendingConfirm.delete(id)
      confirmBtn.remove()
      cancelBtn.remove()
      killBtn.style.display = ''
      killBtn.textContent = original
      clearTimeout(timeoutId)
    }
    // Auto-cancel after 5s — no nag, no commitment.
    const timeoutId = setTimeout(cleanup, 5000)
    cancelBtn.addEventListener('click', (ev) => { ev.stopPropagation(); cleanup() })

    confirmBtn.addEventListener('click', async (ev) => {
      ev.stopPropagation()
      cleanup()
      // Optimistic UI removal (A6): drop from the rendered list and add
      // to the in-flight set so the next poll's snapshot doesn't bring
      // it back during the kill round-trip.
      inFlightKills.add(id)
      row.classList.add('runtime-item-killing')
      const before = getRuntimeState().shells
      setShells(before.filter((s) => String(s.id || '') !== id))
      const result = await killShellSession(id)
      if (result.ok) {
        showNotification(`Killed asd-${id}`, 1500, 'success')
      } else if (result.errorReason === 'no-session') {
        showNotification(`asd-${id} was already gone`, 1500, 'success')
      } else {
        showNotification(`Could not kill asd-${id}`, 2500, 'error')
        // Roll back optimistic removal so the user sees what's still there.
        const current = getRuntimeState().shells
        if (!current.some((s) => String(s.id || '') === id)) {
          setShells([...current, { id, name: `asd-${id}` }])
        }
        inFlightKills.delete(id)
      }
      // On success, in-flight is cleared by the next refreshShells() once
      // it confirms absence. If the panel closes first, set entries stay
      // until next mount — fine; nothing renders against them.
    })

    row.appendChild(confirmBtn)
    row.appendChild(cancelBtn)
    confirmBtn.focus()
  }

  /**
   * Two-step confirmation for kill-all. Same mechanism as confirmKillOne
   * but at the panel level.
   * @param {HTMLButtonElement} killAllBtn
   * @param {HTMLElement} header
   */
  function confirmKillAll (killAllBtn, header) {
    if (killAllBtn.dataset.confirming === '1') return
    killAllBtn.dataset.confirming = '1'

    const original = killAllBtn.textContent
    killAllBtn.style.display = 'none'

    const confirmBtn = document.createElement('button')
    confirmBtn.type = 'button'
    confirmBtn.className = 'runtime-action runtime-action-kill'
    confirmBtn.dataset.testid = 'shells-kill-all-confirm'
    confirmBtn.textContent = 'Confirm kill all'

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'runtime-action'
    cancelBtn.dataset.testid = 'shells-kill-all-cancel'
    cancelBtn.textContent = 'Cancel'

    const cleanup = () => {
      killAllBtn.dataset.confirming = ''
      confirmBtn.remove()
      cancelBtn.remove()
      killAllBtn.style.display = ''
      killAllBtn.textContent = original
      clearTimeout(timeoutId)
    }
    const timeoutId = setTimeout(cleanup, 5000)
    cancelBtn.addEventListener('click', (ev) => { ev.stopPropagation(); cleanup() })

    confirmBtn.addEventListener('click', async (ev) => {
      ev.stopPropagation()
      cleanup()
      // Mark every visible session as in-flight before the call returns
      // so the optimistic empty-state shows immediately.
      const before = getRuntimeState().shells.map((s) => String(s.id || '')).filter(Boolean)
      for (const id of before) inFlightKills.add(id)
      setShells([])
      const result = await killAllShellSessions()
      if (result.ok) {
        showNotification(`Killed ${result.killed} session(s)`, 1500, 'success')
      } else {
        showNotification('Could not kill sessions', 2500, 'error')
      }
    })

    header.appendChild(confirmBtn)
    header.appendChild(cancelBtn)
    confirmBtn.focus()
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
    const result = await listShellSessions()
    shellsStatus = result.status
    shellsErrorReason = result.errorReason || ''
    if (result.status === 'ok') {
      // A confirmed-absent session can leave the in-flight set so a
      // future poll cycle treats it like any other gone session. Sessions
      // still present after a poll keep their in-flight flag (kill is
      // still racing).
      const present = new Set(result.sessions)
      for (const id of Array.from(inFlightKills)) {
        if (!present.has(id)) inFlightKills.delete(id)
      }
      setShells(result.sessions.map((id) => ({ id, name: `asd-${id}` })))
    } else {
      // Don't blow away the rendered list on a transient error — keep
      // showing what we last knew + the error banner. Status flip alone
      // triggers re-render via the runtime change emit below.
      setShells(getRuntimeState().shells)
    }
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
