import { Logger } from '../../utils/Logger.js'

const logger = new Logger('modalFactory.js')

export function openModal ({ id, buildContent, onCloseCallback }) {
  if (document.getElementById(id)) {
    logger.log(`Modal ${id} already open`)
    return
  }

  logger.log(`Opening modal ${id}`)

  function handleEscape (e) {
    if (e.key === 'Escape') {
      closeModal()
    }
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
    if (e.target === backdrop) {
      closeModal()
    }
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
    minWidth: '300px'
  })

  backdrop.appendChild(modal)
  document.body.appendChild(backdrop)

  function closeModal () {
    backdrop.remove()
    window.removeEventListener('keydown', handleEscape)
    if (typeof onCloseCallback === 'function') onCloseCallback()
  }

  buildContent(modal, closeModal)
}
