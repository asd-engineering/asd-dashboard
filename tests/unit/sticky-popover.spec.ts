import { test, expect } from '@playwright/test'

test('position calculation and idempotent close', async ({ page }) => {
  await page.goto('about:blank')
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
    pop.close()
    pop.close()
    pop.destroy()
    pop.destroy()
    return { left: rect?.left || 0, top: rect?.top || 0, attr: anchor.getAttribute('data-sticky-popover-pinned') }
  })
  expect(res.attr).toBe('true')
  expect(res.left).toBeCloseTo(100, 1)
  expect(res.top).toBeCloseTo(210, 1)
})
