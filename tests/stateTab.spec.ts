import { test, expect } from './fixtures'
import { ciConfig } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { getBoardCount, navigate } from './shared/common.js'
import { injectSnapshot } from './shared/state.js'

test.describe.skip('Saved States tab', () => {
  test.beforeEach(async ({ page }) => {
    await navigate(page,'/')
    
    const cfg = ciConfig
    const svc = ciServices
    await injectSnapshot(page, cfg, svc, 'one')
    await injectSnapshot(page, cfg, svc, 'two')
  })

  test('restore and delete snapshot', async ({ page }) => {
    await page.click('#open-config-modal')
    await page.click('.tabs button[data-tab="state"]')
    await expect(page.locator('#stateTab tbody tr')).toHaveCount(2)

    await page.locator('#stateTab tbody tr:first-child button:has-text("Restore")').click()
    await page.click('#fragment-decision-modal button:has-text("Overwrite")')
    
    const boards = await getBoardCount(page);
    expect(boards).toBeGreaterThan(0)

    await page.click('#open-config-modal')
    await page.click('.tabs button[data-tab="state"]')
    page.on('dialog', d => d.accept())
    await page.locator('#stateTab tbody tr:nth-child(2) button:has-text("Delete")').click()
    await expect(page.locator('#stateTab tbody tr')).toHaveCount(1)

    await page.reload()
    
    await page.click('#open-config-modal')
    await page.click('.tabs button[data-tab="state"]')
    await expect(page.locator('#stateTab tbody tr')).toHaveCount(1)
  })
})
