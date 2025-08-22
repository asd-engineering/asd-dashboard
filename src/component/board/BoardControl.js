// @ts-check
/**
 * Board control panel wiring using SelectorPanel.
 * @module BoardControl
 */
import { SelectorPanel } from '../panel/SelectorPanel.js'
import StorageManager from '../../storage/StorageManager.js'
import { createBoard, renameBoard, deleteBoard, switchBoard, resetBoard, updateBoardSelector } from './boardManagement.js'
import emojiList from '../../ui/unicodeEmoji.js'

/**
 * Mount the board control panel into #board-control.
 * @function mountBoardControl
 * @returns {SelectorPanel|null}
 */
export function mountBoardControl () {
  const root = /** @type {HTMLElement} */(document.getElementById('board-control'))
  if (!root) return null

  const select = root.querySelector('#board-selector')
  root.innerHTML = ''
  if (select instanceof HTMLElement) {
    select.style.display = 'none'
    root.appendChild(select)
  }
  const host = document.createElement('div')
  root.appendChild(host)

  const panel = new SelectorPanel({
    root: host,
    testid: 'board-panel',
    placeholder: 'Search Boards',
    showCount: false,
    labelText: () => {
      const id = StorageManager.misc.getLastBoardId()
      const b = (StorageManager.getBoards() || []).find(x => x.id === id)
      return 'Board: ' + (b?.name ?? '—')
    },
    getItems: () => {
      const boards = StorageManager.getBoards() || []
      return boards.map(b => ({ id: b.id, label: b.name, meta: `${b.views.length} views` }))
    },
    onSelect: async (boardId) => {
      await switchBoard(boardId)
      refresh()
      updateBoardSelector()
    },
    onAction: async (action) => {
      const currentId = StorageManager.misc.getLastBoardId()
      if (action === 'create') {
        const name = prompt('Enter new board name:')
        if (name) await createBoard(name)
      } else if (action === 'reset' && currentId) {
        if (typeof resetBoard === 'function') {
          if (confirm('Reset this board?')) await resetBoard(currentId)
        }
      }
      refresh()
      updateBoardSelector()
    },
    onItemAction: async (action, id) => {
      if (action === 'rename') {
        const name = prompt('Enter new board name:')
        if (name) await renameBoard(id, name)
      } else if (action === 'delete') {
        if (confirm('Delete this board?')) await deleteBoard(id)
      }
      refresh()
      updateBoardSelector()
    },
    actions: [
      { key: 'create', label: 'New Board' },
      { key: 'reset', label: 'Reset Board' }
    ],
    selectVerb: () => 'Switch',
    itemActionsFor: () => [
      { action: 'rename', title: 'Rename board', icon: emojiList.edit.unicode },
      { action: 'delete', title: 'Delete board', icon: emojiList.cross.unicode }
    ]
  })

  /** Refresh panel items */
  function refresh () { panel.refresh() }
  refresh()
  return panel
}
