import { test, expect } from '@playwright/test'
import { routeServicesConfig } from './shared/mocking'
import { addServicesByName, handleDialog } from './shared/common'

const secondViewName = 'Second View'

test.describe('Widget Parking Lot', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.waitForLoadState('domcontentloaded')
  })

  test('should preserve iframe DOM via parking lot when switching views', async ({ page }) => {
    // create second view first
    await handleDialog(page, 'prompt', secondViewName)
    await page.click('#view-dropdown .dropbtn')
    await page.click('#view-control a[data-action="create"]')

    // add a widget in second view
    await page.selectOption('#view-selector', { label: secondViewName })
    await addServicesByName(page, 'ASD-terminal', 1)

    // switch to default view and add widget there
    await page.selectOption('#view-selector', { index: 0 })
    await addServicesByName(page, 'ASD-terminal', 1)
    await page.waitForSelector('#widget-container iframe')

    const firstViewIframe = await page.locator('#widget-container iframe').first()
    const iframeElementHandle = await firstViewIframe.elementHandle()
    const iframeSrc = await firstViewIframe.getAttribute('src')

    // switch to second view
    await page.selectOption('#view-selector', { label: secondViewName })

    // switch back to default view
    await page.selectOption('#view-selector', { index: 0 })

    const reappearedIframe = await page.locator(`#widget-container iframe[src="${iframeSrc}"]`).first()
    const reappearedHandle = await reappearedIframe.elementHandle()

    const sameNode = await page.evaluate(({ a, b }) => a === b, { a: iframeElementHandle, b: reappearedHandle })
    expect(sameNode).toBe(true)

    const wrapper = await reappearedIframe.evaluateHandle(el => el.closest('.widget-wrapper'))
    const cacheStatus = await wrapper.getProperty('dataset').then(ds => ds.jsonValue())
    expect(cacheStatus).toMatchObject({ cache: 'hit' })
  })
})
