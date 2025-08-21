// @ts-check
/**
 * View control panel wiring using SelectorPanel.
 * @module ViewControl
 */
import { SelectorPanel } from '../panel/SelectorPanel.js'
import StorageManager from '../../storage/StorageManager.js'
import { getCurrentBoardId } from '../../utils/elements.js'
import { createView, renameView, deleteView, resetView, switchView, updateViewSelector } from '../board/boardManagement.js'
import emojiList from '../../ui/unicodeEmoji.js'

/**
 * Mount the view control panel into #view-control.
 * @function mountViewControl
 * @returns {SelectorPanel|null}
 */
export function mountViewControl () {
  const root = /** @type {HTMLElement} */(document.getElementById('view-control'))
  if (!root) return null

  const select = root.querySelector('#view-selector')
  root.innerHTML = ''
  if (select instanceof HTMLElement) {
    select.style.display = 'none'
    root.appendChild(select)
  }
  const host = document.createElement('div')
  root.appendChild(host)

  const panel = new SelectorPanel({
    root: host,
    testid: 'view-panel',
    placeholder: 'Search Views',
    showCount: false,
    labelText: () => {
      const bId = getCurrentBoardId() || StorageManager.misc.getLastBoardId()
      const vId = StorageManager.misc.getLastViewId()
      const b = (StorageManager.getBoards() || []).find(x => x.id === bId)
      const v = b?.views.find(v => v.id === vId)
      return 'View: ' + (v?.name ?? '—')
    },
    getItems: () => {
      const bId = getCurrentBoardId() || StorageManager.misc.getLastBoardId()
      const board = (StorageManager.getBoards() || []).find(b => b.id === bId)
      return (board?.views || []).map(v => ({ id: v.id, label: v.name }))
    },
    onSelect: async (viewId) => {
      const bId = getCurrentBoardId() || StorageManager.misc.getLastBoardId()
      await switchView(bId, viewId)
      refresh()
      if (bId) updateViewSelector(bId)
    },
    onAction: async (action) => {
      const bId = getCurrentBoardId() || StorageManager.misc.getLastBoardId()
      if (action === 'create' && bId) {
        const name = prompt('Enter new view name:')
        if (name) await createView(bId, name)
      } else if (action === 'reset') {
        const vId = StorageManager.misc.getLastViewId()
        if (bId && vId && confirm('Reset this view?')) await resetView(bId, vId)
      }
      refresh()
      if (bId) updateViewSelector(bId)
    },
    onItemAction: async (action, id) => {
      const bId = getCurrentBoardId() || StorageManager.misc.getLastBoardId()
      if (action === 'rename' && bId) {
        const name = prompt('Enter new view name:')
        if (name) await renameView(bId, id, name)
      } else if (action === 'delete' && bId) {
        if (confirm('Delete this view?')) await deleteView(bId, id)
      }
      refresh()
      if (bId) updateViewSelector(bId)
    },
    actions: [
      { label: 'New View', action: 'create' },
      { label: 'Reset View', action: 'reset' }
    ],
    itemActions: [
      { action: 'rename', title: 'Rename view', icon: emojiList.edit.unicode },
      { action: 'delete', title: 'Delete view', icon: emojiList.noEntry.unicode }
    ]
  })

  /** Refresh panel items */
  function refresh () { panel.refresh() }
  refresh()
  return panel
}
