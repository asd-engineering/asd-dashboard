// @ts-check
/**
 * Minimal controller for the unified service menu.
 * Handles hover, simple keyboard controls and action dispatching.
 *
 * @module serviceMenuController
 */

const menuMap = new WeakMap()

/**
 * Initialize service menu behaviors on a root element.
 * @param {HTMLElement|null} root
 * @returns {void}
 */
export function initServiceMenu (root) {
  if (!(root instanceof HTMLElement)) return
  const state = { timer: /** @type {any} */(null) }
  const dropdown = root.querySelector('[data-testid="service-menu"]')
  const open = () => { root.classList.add('open'); dropdown?.classList.add('open') }
  const close = () => {
    root.classList.remove('open'); dropdown?.classList.remove('open')
    root.querySelectorAll('.submenu.open').forEach(el => el.classList.remove('open'))
  }
  const openSub = (sub, focus = false) => {
    root.querySelectorAll('.submenu.open').forEach(el => { if (el !== sub) el.classList.remove('open') })
    sub.classList.add('open')
    if (focus) {
      const first = /** @type {HTMLElement|null} */(sub.querySelector('[data-action]'))
      first?.focus()
    }
  }
  const closeSub = (sub) => {
    sub.classList.remove('open')
  }
  const handleEnter = () => {
    clearTimeout(state.timer)
    state.timer = setTimeout(open, 0)
  }
  const handleLeave = () => {
    clearTimeout(state.timer)
    state.timer = setTimeout(close, 200)
  }
  root.addEventListener('mouseenter', handleEnter)
  root.addEventListener('mouseleave', handleLeave)

  root.addEventListener('mouseenter', e => {
    const sub = /** @type {HTMLElement} */(e.target).closest('[data-submenu]')
    if (sub && root.contains(sub)) openSub(sub)
  }, true)
  root.addEventListener('mouseleave', e => {
    const sub = /** @type {HTMLElement} */(e.target).closest('[data-submenu]')
    if (sub && root.contains(sub)) setTimeout(() => closeSub(sub), 200)
  }, true)

  root.addEventListener('click', e => {
    const actionEl = /** @type {HTMLElement|null} */((/** @type {HTMLElement} */(e.target)).closest('[data-action]'))
    if (actionEl) {
      e.preventDefault()
      const parentSub = /** @type {HTMLElement|null} */(actionEl.closest('[data-submenu]'))
      const scope = parentSub ? parentSub.dataset.submenu || 'widget' : 'widget'
      const action = actionEl.dataset.action
      root.dispatchEvent(new CustomEvent('menu:action', { bubbles: true, detail: { scope, action } }))
      close()
    }
  })

  root.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const sub = /** @type {HTMLElement|null} */(root.querySelector('.submenu.open'))
      if (sub) {
        closeSub(sub)
        const trigger = /** @type {HTMLElement|null} */(sub.querySelector('.submenu-trigger'))
        trigger?.focus()
      } else {
        close()
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (!root.classList.contains('open')) open()
    } else if (e.key === 'ArrowRight') {
      const focused = /** @type {HTMLElement|null} */(document.activeElement)?.closest('[data-submenu]')
      if (focused) openSub(focused, true)
    } else if (e.key === 'ArrowLeft') {
      const openEl = /** @type {HTMLElement|null} */(root.querySelector('.submenu.open'))
      if (openEl) {
        closeSub(openEl)
        const trigger = /** @type {HTMLElement|null} */(openEl.querySelector('.submenu-trigger'))
        trigger?.focus()
      }
    }
  })

  menuMap.set(root, { handleEnter, handleLeave, close })
}

/**
 * Destroy service menu listeners and timers.
 * @param {HTMLElement|null} root
 * @returns {void}
 */
export function destroyServiceMenu (root) {
  if (!(root instanceof HTMLElement)) return
  const data = menuMap.get(root)
  if (!data) return
  root.removeEventListener('mouseenter', data.handleEnter)
  root.removeEventListener('mouseleave', data.handleLeave)
  data.close()
  menuMap.delete(root)
}
