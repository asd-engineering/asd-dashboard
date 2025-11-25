// @ts-check
/* global ResizeObserver, MutationObserver */
/**
 * Floating widget menu management.
 * Moves widget menus out of their wrapper's stacking context to prevent z-index issues.
 *
 * @module floating-menu
 */

/**
 * attachFloatingWidgetMenu
 *
 * Move a widget's .widget-menu out of the widget wrapper into document.body so it
 * is not trapped by the wrapper's stacking context (transforms, opacity, etc.).
 *
 * Usage:
 *   import { attachFloatingWidgetMenu } from './floating-menu.mjs'
 *   // after widgetWrapper.append(iframe, widgetMenu)
 *   attachFloatingWidgetMenu(widgetWrapper)
 *
 * This function:
 *  - moves the existing .widget-menu element to document.body
 *  - positions it absolutely to remain visually inside the wrapper (top-right)
 *  - observes wrapper size/position changes and window scroll/resize
 *  - restores the menu and cleans observers when the widget is removed from DOM
 *
 * The function returns an object with `.cleanup()` if you want to force removal.
 */
export function attachFloatingWidgetMenu (widgetWrapper) {
  if (!widgetWrapper || !(widgetWrapper instanceof HTMLElement)) {
    throw new Error('widgetWrapper element required')
  }

  const menu = widgetWrapper.querySelector('.widget-menu')
  if (!menu) return { cleanup: () => {} }

  // Avoid double-attachment
  if (menu.dataset.floatingAttached === 'true') {
    return { cleanup: menu._floatingCleanup || (() => {}) }
  }

  // Create a placeholder so we can restore DOM order later
  const placeholder = document.createElement('div')
  placeholder.className = 'widget-menu-placeholder'
  placeholder.style.width = '0'
  placeholder.style.height = '0'
  placeholder.style.display = 'inline-block'
  placeholder.setAttribute('aria-hidden', 'true')

  menu.parentNode.insertBefore(placeholder, menu)

  // Move menu to body
  document.body.appendChild(menu)

  // Ensure menu styling so it floats above everything
  const prev = {
    position: menu.style.position || '',
    top: menu.style.top || '',
    left: menu.style.left || '',
    zIndex: menu.style.zIndex || '',
    pointerEvents: menu.style.pointerEvents || ''
  }

  menu.style.position = 'absolute'
  menu.style.zIndex = '100000' // very high, above all widget chrome
  menu.style.pointerEvents = 'auto'

  // Reposition menu to top-right inside wrapper (5px padding)
  const PADDING = 5

  function getMenuWidth () {
    // if menu is hidden or not yet measured, temporarily show it for measurement
    const cs = getComputedStyle(menu)
    if (cs.display !== 'none' && cs.visibility !== 'hidden') {
      return menu.offsetWidth
    }
    // fallback measurement strategy: clone off-screen
    const clone = menu.cloneNode(true)
    clone.style.position = 'absolute'
    clone.style.visibility = 'hidden'
    clone.style.display = 'block'
    clone.style.left = '-99999px'
    document.body.appendChild(clone)
    const w = clone.offsetWidth
    document.body.removeChild(clone)
    return w
  }

  function reposition () {
    if (!document.body.contains(menu) || !document.body.contains(widgetWrapper)) return
    const rect = widgetWrapper.getBoundingClientRect()
    const menuWidth = getMenuWidth()
    const top = Math.round(rect.top + window.scrollY + PADDING)
    const left = Math.round(rect.left + window.scrollX + rect.width - menuWidth - PADDING)
    menu.style.top = `${top}px`
    menu.style.left = `${left}px`
  }

  // Observers & listeners
  const ro = new ResizeObserver(reposition)
  ro.observe(widgetWrapper)
  ro.observe(menu)

  const onScrollOrResize = () => reposition()
  window.addEventListener('scroll', onScrollOrResize, { passive: true })
  window.addEventListener('resize', onScrollOrResize)

  // Observe DOM removal of widgetWrapper to cleanup
  const mo = new MutationObserver(() => {
    if (!document.body.contains(widgetWrapper)) {
      cleanup()
    }
  })
  mo.observe(document.documentElement, { childList: true, subtree: true })

  // Also watch for attribute/class changes that might affect layout
  const attrObserver = new MutationObserver(reposition)
  attrObserver.observe(widgetWrapper, { attributes: true, attributeFilter: ['style', 'class'] })

  // Public cleanup: restore menu back into its original place and remove observers
  function cleanup () {
    try {
      ro.disconnect()
      mo.disconnect()
      attrObserver.disconnect()
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)

      // restore menu into original position (before placeholder), then remove placeholder
      if (placeholder.parentNode) {
        placeholder.parentNode.insertBefore(menu, placeholder)
        placeholder.parentNode.removeChild(placeholder)
      } else {
        // fallback: append back to wrapper
        if (widgetWrapper) widgetWrapper.appendChild(menu)
      }

      // restore inline styles we changed (keep minimal)
      menu.style.position = prev.position
      menu.style.top = prev.top
      menu.style.left = prev.left
      menu.style.zIndex = prev.zIndex
      menu.style.pointerEvents = prev.pointerEvents
      delete menu.dataset.floatingAttached
      if (menu._floatingCleanup) delete menu._floatingCleanup
    } catch (e) {
      // swallow errors during teardown
      // eslint-disable-next-line no-console
      console.warn('floating menu cleanup error', e)
    }
  }

  menu.dataset.floatingAttached = 'true'
  menu._floatingCleanup = cleanup

  // Initial placement and ensure it's updated asynchronously (layout may change)
  requestAnimationFrame(reposition)
  setTimeout(reposition, 100)

  return { reposition, cleanup }
}
