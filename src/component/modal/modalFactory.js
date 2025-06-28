import emojiList from '../../ui/unicodeEmoji.js'
import { Logger } from '../../utils/Logger.js'

const logger = new Logger('modalFactory.js')

export function openModal ({ id, buildContent, onCloseCallback, showCloseIcon = true }) {
  if (document.getElementById(id)) {
    logger.log(`Modal ${id} already open`)
    return
  }

  logger.log(`Opening modal ${id}`)

  function handleEscape (e) {
    if (e.key === 'Escape') closeModal()
  }
  window.addEventListener('keydown', handleEscape)

  const backdrop = document.createElement('div')
  backdrop.id = `${id}-backdrop`
  Object.assign(backdrop.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000
  })

  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeModal()
  })

  const modal = document.createElement('div')
  modal.id = id
  modal.setAttribute('role', 'dialog')
  Object.assign(modal.style, {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    maxHeight: '80vh',
    overflowY: 'auto',
    minWidth: '300px',
    overflowX: 'hidden'
  })

  if (showCloseIcon) {
    const closeBtn = document.createElement('button')
    closeBtn.innerText = emojiList.cross.icon
    closeBtn.setAttribute('aria-label', 'Close modal')
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '-1.2rem',
      right: '-1.2rem',
      background: 'none',
      border: 'none',
      fontSize: '1.2rem',
      cursor: 'pointer',
      lineHeight: '1'
    })
    closeBtn.addEventListener('click', closeModal)
    modal.appendChild(closeBtn)
  }

  backdrop.appendChild(modal)
  document.body.appendChild(backdrop)

  function closeModal () {
    backdrop.remove()
    window.removeEventListener('keydown', handleEscape)
    if (typeof onCloseCallback === 'function') onCloseCallback()
  }

  buildContent(modal, closeModal)
}
