// @ts-check
/**
 * Board control panel using SelectorPanel.
 * @module BoardControl
 */
import { SelectorPanel } from '../panel/SelectorPanel.js'
import * as adapter from '../panel/adapter.js'

/**
 * Mount board control into #board-control.
 * @function mountBoardControl
 * @returns {SelectorPanel|null}
 */
export function mountBoardControl () {
  const container = document.getElementById('board-control')
  if (!container) return null
  const select = container.querySelector('#board-selector')
  container.innerHTML = ''
  if (select instanceof HTMLElement) {
    select.style.display = 'none'
    container.appendChild(select)
  }
  const host = document.createElement('div')
  container.appendChild(host)

  const panel = new SelectorPanel({
    root: host,
    testid: 'board-panel',
    placeholder: 'Search Boards',
    countText: () => {
      const boards = adapter.getBoards()
      const current = boards.find(b => b.id === adapter.getCurrentBoardId())
      return `Boards: ${boards.length}${current ? ` • Current: ${current.name}` : ''}`
    },
    getItems: () => {
      return adapter.getBoards().map(b => ({ id: b.id, label: b.name, meta: `${b.views?.length || 0} views` }))
    },
    onSelect: async id => {
      await adapter.switchBoard(id)
      panel.refresh()
      // @ts-ignore
      if (window.__viewPanel) window.__viewPanel.refresh()
    },
    onAction: async (action, ctx) => {
      await adapter.handleBoardAction(action, ctx)
      panel.refresh()
      // @ts-ignore
      if (window.__viewPanel) window.__viewPanel.refresh()
    },
    context: () => ({ boardId: adapter.getCurrentBoardId() }),
    actions: [
      { label: 'Create Board', action: 'create' },
      { label: 'Rename Board', action: 'rename' },
      { label: 'Delete Board', action: 'delete' }
    ]
  })

  // @ts-ignore
  window.__boardPanel = panel
  return panel
}
