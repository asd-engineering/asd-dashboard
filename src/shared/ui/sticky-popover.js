// @ts-check
/** @module sticky-popover */

/**
 * @typedef {Object} StickyPopoverCfg
 * @property {HTMLElement} anchor
 * @property {HTMLElement} content
 * @property {'fixed'|'absolute'} [strategy]
 */

/**
 * Create a sticky popover anchored to an element.
 * @function createStickyPopover
 * @param {StickyPopoverCfg} cfg
 * @returns {{open:()=>void,pin:()=>void,unpin:()=>void,close:()=>void,destroy:()=>void,isPinned:()=>boolean}}
 */
export function createStickyPopover (cfg) {
  const { anchor, content, strategy = 'fixed' } = cfg || {}
  if (!(anchor instanceof HTMLElement)) throw new TypeError('anchor must be HTMLElement')
  if (!(content instanceof HTMLElement)) throw new TypeError('content must be HTMLElement')

  const layerId = 'asd-layer-root'
  let root = null
  let currentStrategy = strategy
  let pinned = false
  let focusables = []
  const listeners = []

  const ensureLayerRoot = () => {
    let el = document.getElementById(layerId)
    if (!el) {
      el = document.createElement('div')
      el.id = layerId
      document.body.appendChild(el)
    }
    return el
  }

  const computePos = () => {
    const r = anchor.getBoundingClientRect()
    return { left: r.left, top: r.bottom }
  }

  const trapFocus = (e) => {
    if (e.key === 'Tab') {
      if (focusables.length === 0) return
      e.preventDefault()
      const dir = e.shiftKey ? -1 : 1
      const idx = focusables.indexOf(document.activeElement)
      const next = focusables[(idx + dir + focusables.length) % focusables.length]
      if (next instanceof HTMLElement) next.focus()
    } else if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
      if (focusables.length === 0) return
      e.preventDefault()
      const idx = focusables.indexOf(document.activeElement)
      const next = focusables[(idx + 1) % focusables.length]
      if (next instanceof HTMLElement) next.focus()
    } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
      if (focusables.length === 0) return
      e.preventDefault()
      const idx = focusables.indexOf(document.activeElement)
      const next = focusables[(idx - 1 + focusables.length) % focusables.length]
      if (next instanceof HTMLElement) next.focus()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      api.close()
    }
  }

  const onDocPointer = (e) => {
    if (!root) return
    if (root.contains(e.target)) return
    api.close()
  }

  const onDocKey = (e) => {
    if (e.key === 'Escape') api.close()
  }

  const mount = () => {
    if (root) return
    root = document.createElement('div')
    root.dataset.stickyPopover = 'true'
    root.tabIndex = -1
    root.setAttribute('role', 'dialog')
    root.setAttribute('aria-modal', 'false')
    root.setAttribute('aria-keyshortcuts', 'Escape')
    root.appendChild(content)
    ensureLayerRoot().appendChild(root)
    focusables = Array.from(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    if (focusables[0] instanceof HTMLElement) focusables[0].focus()
    root.addEventListener('keydown', trapFocus)
    listeners.push(['keydown', trapFocus])
  }

  const unmount = () => {
    if (!root) return
    root.removeEventListener('keydown', trapFocus)
    listeners.splice(0)
    anchor.appendChild(content)
    root.remove()
    root = null
    focusables = []
  }

  const api = {
    open () {
      mount()
      const pos = computePos()
      root.style.left = pos.left + 'px'
      root.style.top = pos.top + 'px'
      root.style.position = currentStrategy
    },
    pin () {
      if (!root) return
      const pos = computePos()
      root.style.left = pos.left + 'px'
      root.style.top = pos.top + 'px'
      root.style.position = 'fixed'
      root.setAttribute('aria-modal', 'true')
      currentStrategy = 'fixed'
      pinned = true
      anchor.setAttribute('data-sticky-popover-pinned', 'true')
      document.addEventListener('pointerdown', onDocPointer)
      document.addEventListener('keydown', onDocKey)
    },
    unpin () {
      if (!pinned) return
      pinned = false
      anchor.removeAttribute('data-sticky-popover-pinned')
      document.removeEventListener('pointerdown', onDocPointer)
      document.removeEventListener('keydown', onDocKey)
    },
    close () {
      api.unpin()
      unmount()
      if (anchor instanceof HTMLElement) anchor.focus()
    },
    destroy () {
      api.close()
    },
    isPinned: () => pinned
  }

  return api
}
