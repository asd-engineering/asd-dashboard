// @ts-check
import { test, expect } from './fixtures'
import { routeServicesConfig } from './shared/mocking'
import { navigate, getConfigBoards, getServices } from './shared/common'

 test.describe('dashboard reset', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page,'/')
  })

  test('preserves snapshots and allows wiping state store', async ({ page }) => {
    await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js')
      sm.setConfig({ boards: [{ id: 'b1', name: 'B1', views: [] }, { id: 'b2', name: 'B2', views: [] }] })
      sm.setServices([{ name: 'svc1', url: '' }] as any)
      await sm.saveStateSnapshot({ name: 'snap', type: 'manual', cfg: 'a', svc: 'b' })
    })

    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('keep saved states')
      dialog.accept()
    })
    
    await Promise.all([
      page.click('#reset-button'),
      page.waitForLoadState('networkidle')
    ])

    const boards = await getConfigBoards(page)
    expect(boards.some(b => b.id === 'b2')).toBeFalsy()
    const services = await getServices(page);
    expect(services.some(s => s.name === 'svc1')).toBeFalsy()

    await page.click('#open-config-modal')
    await page.click('button:has-text("Snapshots & Share")')
    await expect(page.locator('#stateTab tbody tr:has-text("snap")')).toHaveCount(1)

    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Delete all saved snapshots')
      dialog.accept()
    })
    await page.click('text=Delete all snapshots')
    await expect(page.locator('#stateTab tbody tr:has-text("snap")')).toHaveCount(0)
  })
 })
