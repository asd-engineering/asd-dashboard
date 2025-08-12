// @ts-check
/**
 * View control panel using SelectorPanel.
 * @module ViewControl
 */
import { SelectorPanel } from '../panel/SelectorPanel.js'
import * as adapter from '../panel/adapter.js'

/**
 * Mount view control into #view-control.
 * @function mountViewControl
 * @returns {SelectorPanel|null}
 */
export function mountViewControl () {
  const container = document.getElementById('view-control')
  if (!container) return null
  const select = container.querySelector('#view-selector')
  container.innerHTML = ''
  if (select instanceof HTMLElement) {
    select.style.display = 'none'
    container.appendChild(select)
  }
  const host = document.createElement('div')
  container.appendChild(host)

  const panel = new SelectorPanel({
    root: host,
    testid: 'view-panel',
    placeholder: 'Search Views',
    countText: () => {
      const boards = adapter.getBoards()
      const board = boards.find(b => b.id === adapter.getCurrentBoardId())
      const views = board?.views || []
      const current = views.find(v => v.id === adapter.getCurrentViewId())
      return `Views: ${views.length}${current ? ` • Current: ${current.name}` : ''}`
    },
    getItems: () => {
      const boards = adapter.getBoards()
      const board = boards.find(b => b.id === adapter.getCurrentBoardId())
      const views = board?.views || []
      return views.map(v => ({ id: v.id, label: v.name }))
    },
    onSelect: async id => {
      await adapter.switchView(adapter.getCurrentBoardId(), id)
      panel.refresh()
    },
    onAction: async (action, ctx) => {
      await adapter.handleViewAction(action, ctx)
      panel.refresh()
    },
    context: () => ({ boardId: adapter.getCurrentBoardId(), viewId: adapter.getCurrentViewId() }),
    actions: [
      { label: 'Create View', action: 'create' },
      { label: 'Rename View', action: 'rename' },
      { label: 'Delete View', action: 'delete' },
      { label: 'Reset View', action: 'reset' }
    ]
  })

  // @ts-ignore
  window.__viewPanel = panel
  return panel
}
