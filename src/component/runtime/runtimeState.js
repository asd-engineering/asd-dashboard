// @ts-check
/**
 * Lightweight runtime state for tasks/shells/processes UI.
 * @module runtime/runtimeState
 */

const RUNTIME_EVENT = 'asd:runtime:changed'

/**
 * Ensure runtime container exists.
 * @returns {{tasks:any[],shells:any[],processes:any[]}}
 */
function ensureRuntime () {
  if (!window.asd) window.asd = {}
  if (!window.asd.runtime) {
    window.asd.runtime = {
      tasks: [],
      shells: [],
      processes: []
    }
  }
  return window.asd.runtime
}

/**
 * Emit runtime change event.
 * @returns {void}
 */
function emitRuntimeChange () {
  document.dispatchEvent(new CustomEvent(RUNTIME_EVENT, { bubbles: true, composed: true }))
}

/**
 * Subscribe to runtime change events.
 * @param {() => void} listener
 * @returns {() => void}
 */
export function onRuntimeChange (listener) {
  /** @type {EventListener} */
  const cb = () => listener()
  document.addEventListener(RUNTIME_EVENT, cb)
  return () => document.removeEventListener(RUNTIME_EVENT, cb)
}

/**
 * Get runtime snapshot.
 * @returns {{tasks:any[],shells:any[],processes:any[]}}
 */
export function getRuntimeState () {
  const runtime = ensureRuntime()
  return {
    tasks: [...runtime.tasks],
    shells: [...runtime.shells],
    processes: [...runtime.processes]
  }
}

/**
 * Add or replace task entry.
 * @param {{id:string,title:string,status?:string,open?:() => void}} task
 */
export function upsertTask (task) {
  const runtime = ensureRuntime()
  const index = runtime.tasks.findIndex(t => t.id === task.id)
  const next = {
    id: task.id,
    title: task.title,
    status: task.status || 'running',
    updatedAt: new Date().toISOString(),
    open: task.open
  }
  if (index >= 0) {
    runtime.tasks[index] = { ...runtime.tasks[index], ...next }
  } else {
    runtime.tasks.unshift(next)
  }
  emitRuntimeChange()
}

/**
 * Update task fields.
 * @param {string} id
 * @param {Record<string, any>} patch
 */
export function updateTask (id, patch) {
  const runtime = ensureRuntime()
  const index = runtime.tasks.findIndex(t => t.id === id)
  if (index < 0) return
  runtime.tasks[index] = {
    ...runtime.tasks[index],
    ...patch,
    updatedAt: new Date().toISOString()
  }
  emitRuntimeChange()
}

/**
 * Replace process state list from current services.
 * @param {any[]} processes
 */
export function setProcesses (processes) {
  const runtime = ensureRuntime()
  runtime.processes = Array.isArray(processes) ? [...processes] : []
  emitRuntimeChange()
}

/**
 * Replace shell session list.
 * @param {any[]} shells
 */
export function setShells (shells) {
  const runtime = ensureRuntime()
  runtime.shells = Array.isArray(shells) ? [...shells] : []
  emitRuntimeChange()
}

export { RUNTIME_EVENT }
