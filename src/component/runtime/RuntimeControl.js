// @ts-check
/**
 * Runtime control header tabs (Tasks/Shells/Processes).
 * @module runtime/RuntimeControl
 */

import { StorageManager } from '../../storage/StorageManager.js'
import {
  getRuntimeState,
  onRuntimeChange
} from './runtimeState.js'

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
          const status = document.createElement('span')
          status.className = 'runtime-status'
          status.textContent = String(task.status || 'running')
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
      const items = runtime.shells.length
        ? runtime.shells
        : [{ id: 'terminal-default', name: 'Default Shell' }]
      if (!items.length) {
        list.textContent = 'No shell sessions.'
      } else {
        for (const shell of items) {
          const row = document.createElement('div')
          row.className = 'runtime-item'
          row.textContent = String(shell.name || shell.id || 'shell')
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
          const st = document.createElement('span')
          st.className = 'runtime-status'
          st.textContent = String(proc.state || proc.status || 'unknown')
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
      shells: runtime.shells.length || 1,
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
        return
      }
      activeTab = def.key
      panel.hidden = false
      for (const [key, item] of Object.entries(tabButtons)) {
        item.classList.toggle('active', key === def.key)
      }
      renderPanel(/** @type {'tasks'|'shells'|'processes'} */ (def.key))
    })
    tabButtons[def.key] = btn
    tabs.appendChild(btn)
  }

  root.append(tabs, panel)
  onRuntimeChange(refresh)
  refresh()

  return { refresh }
}
