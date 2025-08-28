import { test, expect } from './fixtures'
import { ciConfig, ciBoards } from './data/ciConfig'
import { ciServices } from './data/ciServices'
import { navigate } from './shared/common.js'
import { openConfigModalSafe } from './shared/uiHelpers'
import { injectSnapshot } from './shared/state.js'

test('merge snapshot unions boards and services without duplicates', async ({ page }) => {
  await navigate(page,'/')
  const stateA = { ...ciConfig, boards: [ciBoards[0]] }
  await page.evaluate(([cfg, svc]) => {
    localStorage.setItem('config', JSON.stringify(cfg))
    localStorage.setItem('services', JSON.stringify(svc))
  }, [stateA, [ciServices[0]]])
  const serviceDup = { ...ciServices[0], id: 'toolbox-copy', name: 'ASD-toolbox ' }
  const stateBBoards = [ciBoards[0], ciBoards[1]]
  const stateBServices = [ciServices[1], serviceDup]
  await injectSnapshot(page, { ...ciConfig, boards: stateBBoards }, stateBServices, 'export/stateB')
  await openConfigModalSafe(page)
  await page.click('.tabs button[data-tab="stateTab"]')
  await page.locator('#stateTab').waitFor();
  await page.locator('#stateTab tbody tr:has-text("export/stateB") button[data-action="merge"]').click({ force: true })
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => document.body.dataset.ready === 'true')
  await page.waitForSelector('#open-config-modal')
  
  const final = await page.evaluate(async () => {
    const { default: sm } = await import('/storage/StorageManager.js')
    return { boards: sm.getConfig().boards.length, services: sm.getServices().length }
  })
  expect(final.boards).toBe(2)
  expect(final.services).toBe(2)
})
