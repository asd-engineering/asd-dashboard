// @ts-check
/**
 * Utilities for deferred DOM insertion of widgets.
 *
 * @module deferredMount
 */

import { initializeResizeHandles } from '../events/resizeHandler.js'

const pending = new Set()

/**
 * Schedule mounting of an element on the next idle frame.
 * @param {HTMLElement} parent
 * @param {HTMLElement} child
 * @returns {() => void} Cancel function
 */
export function deferredMount (parent, child) {
  const cb = () => {
    parent.appendChild(child)
    initializeResizeHandles()
    pending.delete(cancel)
  }
  let handle
  if ('requestIdleCallback' in window) {
    handle = window.requestIdleCallback(cb)
  } else {
    handle = setTimeout(cb, 0)
  }
  function cancel () {
    if (handle !== undefined) {
      if ('cancelIdleCallback' in window && typeof handle === 'number') {
        // @ts-ignore
        window.cancelIdleCallback(handle)
      } else {
        clearTimeout(handle)
      }
    }
    pending.delete(cancel)
  }
  pending.add(cancel)
  return cancel
}

/**
 * Cancel all pending mount operations.
 * @returns {void}
 */
export function cancelAllMounts () {
  for (const cancel of Array.from(pending)) {
    cancel()
  }
  pending.clear()
}
