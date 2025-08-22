// @ts-check
/* global Element */
/**
 * Apply hover intent to selector rows with cancellable delay.
 * @module selector-hover-intent
 */

/**
 * Install hover intent listeners on a root element to toggle an active class
 * after a delay only when the pointer rests over a target item.
 * @function installHoverIntent
 * @param {object} [cfg]
 * @param {Element} [cfg.root] - Root element hosting the items.
 * @param {string} [cfg.selector] - CSS selector to match actionable rows.
 * @param {number} [cfg.delay] - Milliseconds before the active class is applied.
 * @param {string} [cfg.activeClass] - Class toggled to reveal actions in CSS.
 * @returns {{dispose: () => void, rescan: () => void}}
 */
export function installHoverIntent (cfg = {}) {
  const { root, selector = '.panel-item', delay = 250, activeClass = 'hover-active' } = cfg
  if (!root || !(root instanceof Element)) {
    throw new TypeError('installHoverIntent: "root" must be a DOM Element')
  }

  const STATE_SYM = Symbol.for('asd.selector.hoverIntent.state')
  if (root[STATE_SYM]) return root[STATE_SYM].api

  const timers = new WeakMap()
  const active = new WeakSet()
  const attached = new WeakSet()
  let disposed = false

  const onEnter = (el) => {
    if (active.has(el) || timers.has(el)) return
    const id = setTimeout(() => {
      timers.delete(el)
      if (disposed) return
      el.classList.add(activeClass)
      active.add(el)
      el.setAttribute('data-hover-intent', 'true')
    }, delay)
    timers.set(el, id)
  }

  const clearTimer = (el) => {
    const id = timers.get(el)
    if (id != null) {
      clearTimeout(id)
      timers.delete(el)
    }
  }

  const onLeave = (el) => {
    clearTimer(el)
    if (active.has(el)) {
      el.classList.remove(activeClass)
      active.delete(el)
      el.removeAttribute('data-hover-intent')
    }
  }

  const handleMouseOver = (e) => {
    if (disposed) return
    const el = e.target.closest(selector)
    if (!el || !root.contains(el)) return
    if (!attached.has(el)) attached.add(el)
    onEnter(el)
  }

  const handleMouseOut = (e) => {
    if (disposed) return
    const el = e.target.closest(selector)
    if (!el || !root.contains(el)) return
    const to = /** @type {Element|null} */ (e.relatedTarget)
    if (to && el.contains(to)) return
    onLeave(el)
  }

  const handlePointerDown = (e) => {
    const el = e.target.closest(selector)
    if (el && root.contains(el)) clearTimer(el)
  }

  root.addEventListener('mouseover', handleMouseOver, true)
  root.addEventListener('mouseout', handleMouseOut, true)
  root.addEventListener('pointerdown', handlePointerDown, true)

  const dispose = () => {
    if (disposed) return
    disposed = true
    root.removeEventListener('mouseover', handleMouseOver, true)
    root.removeEventListener('mouseout', handleMouseOut, true)
    root.removeEventListener('pointerdown', handlePointerDown, true)
    root.querySelectorAll(selector).forEach((el) => {
      clearTimer(el)
      if (active.has(el)) {
        el.classList.remove(activeClass)
        el.removeAttribute('data-hover-intent')
        active.delete(el)
      }
    })
  }

  const api = {
    dispose,
    rescan () {}
  }

  root[STATE_SYM] = { api }

  return api
}
