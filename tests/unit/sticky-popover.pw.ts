import { test, expect } from '../fixtures'
import { navigate } from '../shared/common'
import { routeServicesConfig } from '../shared/mocking'

test.describe('sticky popover unit', () => {
  test('position calculation and idempotent close', async ({ page }) => {
    // Navigate to app so we can import the module
    await routeServicesConfig(page)
    await navigate(page, '/')

    const res = await page.evaluate(async () => {
      const anchor = document.createElement('div')
      anchor.style.position = 'absolute'
      anchor.style.left = '100px'
      anchor.style.top = '200px'
      anchor.style.width = '10px'
      anchor.style.height = '10px'
      document.body.appendChild(anchor)

      const content = document.createElement('div')
      content.innerHTML = '<button>ok</button>'

      const mod = await import('/shared/ui/sticky-popover.js')
      const pop = mod.createStickyPopover({ anchor, content })

      pop.open()
      pop.pin()

      const rect = document.querySelector('[data-sticky-popover]')?.getBoundingClientRect()
      const attrWhilePinned = anchor.getAttribute('data-sticky-popover-pinned')

      // Test idempotent close/destroy
      pop.close()
      pop.close() // should not throw
      pop.destroy()
      pop.destroy() // should not throw

      const attrAfterClose = anchor.getAttribute('data-sticky-popover-pinned')
      const popoverGone = document.querySelector('[data-sticky-popover]') === null

      return {
        left: rect?.left || 0,
        top: rect?.top || 0,
        attrWhilePinned,
        attrAfterClose,
        popoverGone
      }
    })

    expect(res.attrWhilePinned).toBe('true')
    expect(res.attrAfterClose).toBeNull()
    expect(res.popoverGone).toBe(true)
    expect(res.left).toBeCloseTo(100, 0)
    expect(res.top).toBeCloseTo(210, 0)
  })

  test('focus trap enumerates focusables once per open', async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page, '/')

    const result = await page.evaluate(async () => {
      const anchor = document.createElement('div')
      document.body.appendChild(anchor)

      const content = document.createElement('div')
      content.innerHTML = '<button id="b1">A</button><button id="b2">B</button><button id="b3">C</button>'

      const mod = await import('/shared/ui/sticky-popover.js')
      const pop = mod.createStickyPopover({ anchor, content })

      pop.open()
      const firstFocused = document.activeElement?.id

      // Simulate arrow key navigation
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))

      pop.close()
      return { firstFocused }
    })

    expect(result.firstFocused).toBe('b1')
  })
})
