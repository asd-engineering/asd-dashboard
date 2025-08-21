// @ts-check
import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { navigate, getConfigBoards } from './shared/common'

 test.describe('dashboard reset', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page,'/')
  })

  test('preserves snapshots and allows wiping state store', async ({ page }) => {
    await page.evaluate(async () => {
      const { StorageManager: sm } = await import('/storage/StorageManager.js')
      sm.setConfig({ boards: [{ id: 'b1', name: 'B1', views: [] }, { id: 'b2', name: 'B2', views: [] }] })
      sm.setServices([{ name: 'svc1', url: '' }] as any)
      await sm.saveStateSnapshot({ name: 'snap', type: 'manual', cfg: 'a', svc: 'b' })
    })

    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('keep saved states')
      dialog.accept()
    })
    await Promise.all([
      page.waitForNavigation(),
      page.click('#reset-button')
    ])

    const boards = await getConfigBoards(page)
    expect(boards.some(b => b.id === 'b2')).toBeFalsy()
    const services = await page.evaluate(async () => {
      const { StorageManager: sm } = await import('/storage/StorageManager.js');
      return sm.getServices();
    })
    expect(services.some(s => s.name === 'svc1')).toBeFalsy()

    await page.click('#open-config-modal')
    await page.click('button:has-text("Saved States")')
    await expect(page.locator('#stateTab tbody tr')).toHaveCount(1)

    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Delete all saved states')
      dialog.accept()
    })
    await page.click('text=Delete all snapshots')
    await expect(page.locator('#stateTab tbody tr')).toHaveCount(0)
  })
 })
