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
    if (sub && root.contains(sub)) sub.classList.add('open')
  }, true)
  root.addEventListener('mouseleave', e => {
    const sub = /** @type {HTMLElement} */(e.target).closest('[data-submenu]')
    if (sub && root.contains(sub)) setTimeout(() => sub.classList.remove('open'), 200)
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
      const sub = root.querySelector('.submenu.open')
      if (sub) {
        sub.classList.remove('open')
      } else {
        close()
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (!root.classList.contains('open')) open()
    } else if (e.key === 'ArrowRight') {
      const focused = /** @type {HTMLElement|null} */(document.activeElement)?.closest('[data-submenu]')
      if (focused) focused.classList.add('open')
    } else if (e.key === 'ArrowLeft') {
      const openSub = root.querySelector('.submenu.open')
      if (openSub) openSub.classList.remove('open')
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
