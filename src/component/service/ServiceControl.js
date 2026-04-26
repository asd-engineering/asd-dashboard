// @ts-check
/**
 * Service control panel wiring using SelectorPanel.
 * Provides service selection with counts and actions.
 * @module ServiceControl
 */
import { SelectorPanel } from '../panel/SelectorPanel.js'
import { StorageManager } from '../../storage/StorageManager.js'
import { addWidget, removeWidget, findServiceLocation } from '../widget/widgetManagement.js'
import { widgetStore } from '../widget/widgetStore.js'
import { getCurrentBoardId, getCurrentViewId } from '../../utils/elements.js'
import { resolveServiceConfig } from '../../utils/serviceUtils.js'
import { showNotification } from '../dialog/notification.js'
import { switchBoard } from '../board/boardManagement.js'
import emojiList from '../../ui/unicodeEmoji.js'
import { Logger } from '../../utils/Logger.js'
import { showServiceModal } from '../modal/serviceLaunchModal.js'

const logger = new Logger('ServiceControl.js')

/**
 * Check whether the ttyd service is online.
 * All task actions (launch terminal, start/stop service) require ttyd.
 * @returns {boolean}
 */
function isTtydAvailable () {
  const services = StorageManager.getServices() || []
  const ttyd = services.find(s => s.id === 'ttyd')
  return Boolean(ttyd && String(ttyd.state || '').toLowerCase() === 'online')
}

/**
 * Build ttyd URL-arg task URL.
 * CLI commands follow `asd <serviceId> <action>` pattern.
 * @param {string} serviceId
 * @param {'start'|'stop'|'restart'|'terminal'} action
 * @returns {string}
 */
function buildTtydTaskUrl (serviceId, action) {
  const params = new URLSearchParams()
  params.append('arg', 'asd')
  params.append('arg', serviceId)
  params.append('arg', action)
  return `/asde/terminal/?${params.toString()}`
}

/**
 * Emit a standardized state change event.
 * @param {string} reason
 */
function emitStateChange (reason) {
  document.dispatchEvent(new CustomEvent('state-change', { detail: { reason } }))
}

/**
 * Compute total widgets across all boards and views.
 * @returns {number}
 */
function getGlobalWidgetTotal () {
  const boards = StorageManager.getBoards() || []
  return boards.reduce(
    (sum, b) => sum + (b.views || []).reduce((s, v) => s + ((v.widgetState || []).length), 0),
    0
  )
}

/**
 * Count active instances for a given service.
 * @param {string} serviceId
 * @returns {number}
 */
function countServiceInstances (serviceId) {
  const boards = StorageManager.getBoards() || []
  return boards.reduce(
    (c, b) => c + (b.views || []).reduce(
      (s, v) => s + (v.widgetState || []).filter(w => w.serviceId === serviceId).length, 0
    ),
    0
  )
}

/**
 * Compute global widget counter text.
 * @returns {string}
 */
function globalCountText () {
  const running = widgetStore.widgets.size
  const widgets = getGlobalWidgetTotal()
  const cfg = StorageManager.getConfig()
  const maxFromConfig = cfg?.globalSettings?.maxTotalInstances
  const max = (typeof widgetStore?.maxSize === 'number' ? widgetStore.maxSize : null) ?? (typeof maxFromConfig === 'number' ? maxFromConfig : null)
  const maxDisplay = max !== null ? max : '∞'
  return `Running: ${running}/${maxDisplay} Widgets: ${widgets}`
}

/**
 * Mount the service control panel into #widget-selector-panel.
 * @function mountServiceControl
 * @returns {SelectorPanel|null}
 */
export function mountServiceControl () {
  const root = /** @type {HTMLElement} */(document.getElementById('widget-selector-panel'))
  if (!root) return null

  const panel = new SelectorPanel({
    root,
    testid: 'service-panel',
    placeholder: 'Search or Select Widget',
    showCount: true,
    countText: globalCountText,
    labelText: null,
    getItems: () => {
      const services = StorageManager.getServices() || []
      const overGlobal = typeof widgetStore.maxSize === 'number' && widgetStore.widgets.size >= widgetStore.maxSize
      return services.map(svc => {
        const resolved = resolveServiceConfig(svc)
        const instances = countServiceInstances(resolved.id)
        const max = resolved.maxInstances ?? '∞'
        const overService = typeof resolved.maxInstances === 'number' && instances >= resolved.maxInstances
        const canNavigate = instances > 0
        return {
          id: resolved.id,
          label: resolved.name,
          meta: `${String(resolved.state || 'unknown')} (${instances}/${max})`,
          url: resolved.url,
          fallback: resolved.fallback,
          overService,
          name: resolved.name,
          overGlobal,
          instances,
          canNavigate,
          state: resolved.state || 'unknown'
        }
      })
    },
    onSelect: async (id) => {
      const svc = (StorageManager.getServices() || []).find(s => s.id === id)
      if (!svc) return
      const resolved = resolveServiceConfig(svc)

      const instances = countServiceInstances(resolved.id)
      const max = resolved.maxInstances

      // If the service's instance limit is met or exceeded...
      if (typeof max === 'number' && instances >= max) {
        const location = findServiceLocation(resolved.id)
        if (location) {
          // ...navigate to the existing widget instead of adding a new one.
          await switchBoard(location.boardId, location.viewId)
          showNotification(`Limit reached. Navigated to existing "${resolved.name}" widget.`, 3000, 'success')
        } else {
          showNotification(`Limit for "${resolved.name}" reached, but existing widget could not be located.`, 4000, 'error')
        }
        return // IMPORTANT: Stop execution here.
      }

      // This code will now only run if the instance limit has not been reached
      await addWidget(resolved.url, undefined, undefined, 'iframe', getCurrentBoardId(), getCurrentViewId())
      emitStateChange('services')
      panel.refresh()
    },

    onAction: async (action) => {
      if (action === 'create') {
        const mod = await import('../modal/saveServiceModal.js')
        mod.openSaveServiceModal({ mode: 'new', url: '' })
      }
    },
    onItemAction: async (action, id) => {
      const svc = (StorageManager.getServices() || []).find(s => s.id === id)
      if (!svc) return
      const resolved = resolveServiceConfig(svc)
      if (action === 'rename') {
        const mod = await import('../modal/saveServiceModal.js')
        mod.openSaveServiceModal({ mode: 'edit', service: svc })
      } else if (action === 'delete') {
        // eslint-disable-next-line no-alert
        if (confirm('Remove this service and all its widgets?')) {
          document.querySelectorAll('.widget-wrapper').forEach(async el => {
            if (el instanceof HTMLElement && el.dataset.service === resolved.name) {
              await removeWidget(el)
            }
          })
          StorageManager.updateBoards(boards => {
            boards.forEach(b => {
              b.views.forEach(v => {
                v.widgetState = (v.widgetState || []).filter(w => w.url !== resolved.url)
              })
            })
          })
          const updated = (StorageManager.getServices() || []).filter(s => s.id !== id)
          StorageManager.setServices(updated)
          emitStateChange('services')
        }
      } else if (action === 'navigate') {
        const location = findServiceLocation(resolved.id)
        if (location) {
          await switchBoard(location.boardId, location.viewId)
          showNotification(`Navigated to view containing "${resolved.name}".`, 2500, 'success')
        } else {
          showNotification(`No instances of "${resolved.name}" found in any board.`, 3000, 'error')
          logger.error(`Service with name "${resolved.name}" not found in StorageManager.`)
        }
      } else if (action === 'task') {
        if (resolved.fallback?.url) {
          showServiceModal({ id: resolved.id, name: resolved.name, url: resolved.fallback.url }, null, {
            onDone: () => panel.refresh()
          })
        } else {
          showNotification(`No service action configured for "${resolved.name}".`, 2500, 'error')
        }
      } else if (action === 'launch') {
        const taskUrl = buildTtydTaskUrl(resolved.id, 'terminal')
        showServiceModal(
          {
            id: resolved.id,
            name: `${resolved.name} terminal`,
            url: taskUrl
          },
          null
        )
      } else if (action.startsWith('task-')) {
        const taskAction = /** @type {'start'|'stop'|'restart'|'terminal'} */ (action.replace('task-', ''))
        const taskUrl = buildTtydTaskUrl(resolved.id, taskAction)
        showServiceModal(
          {
            id: resolved.id,
            name: `${resolved.name} ${taskAction}`,
            url: taskUrl
          },
          null
        )
      }
      panel.refresh()
    },
    actions: [
      { key: 'create', label: 'New Service' }
    ],
    selectVerb: () => 'Add',
    itemActionsFor: (item) => {
      /** @type {{action:string,title:string,icon:string}[]} */
      const acts = []
      const ttydUp = isTtydAvailable()
      if (ttydUp) {
        acts.push({ action: 'launch', title: 'Launch terminal task', icon: emojiList.launch.unicode })
      }
      if (item.canNavigate) {
        acts.push({ action: 'navigate', title: 'Locate widget', icon: emojiList.magnifyingGlass.unicode })
      }
      if (item.fallback?.url) {
        const label = String(item.fallback.name || '').toLowerCase()
        const isStart = label.includes('start') || label.includes('launch')
        acts.push({
          action: 'task',
          title: item.fallback.name || 'Run service task',
          icon: isStart ? emojiList.launch.unicode : emojiList.noEntry.unicode
        })
      }
      acts.push({ action: 'rename', title: 'Rename service', icon: emojiList.edit.unicode })
      acts.push({ action: 'delete', title: 'Delete service', icon: emojiList.cross.unicode })
      return acts
    }
  })

  window.__openWidgetPanel = () => panel.dom.wrap.classList.add('open')

  document.addEventListener('state-change', (e) => {
    const reason = /** @type {CustomEvent} */(e).detail?.reason
    if (reason === 'services' || reason === 'config') {
      panel.refresh()
    }
  })

  panel.refresh()
  return panel
}
