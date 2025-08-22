import { expect, Page } from '@playwright/test'

export async function ensurePanelOpen (page: Page, panelTestId: string) {
  const panel = page.locator(`[data-testid="${panelTestId}"]`)
  await panel.hover()
  await expect(panel.locator('.dropdown-content')).toBeVisible()
}

export async function openCreateFromTopMenu (page: Page, panelTestId: 'service-panel' | 'board-panel' | 'view-panel', label: string) {
  await ensurePanelOpen(page, panelTestId)
  const menu = page.locator(`[data-testid="${panelTestId}"] .menu`)
  const direct = menu.locator('.menu-item', { hasText: label }).first()
  if (await direct.count()) {
    await direct.click()
    return
  }
  const submenu = menu.locator('.menu-item').first()
  await submenu.hover()
  const actionBtn = submenu
    .locator('.panel-item-actions-flyout button', { hasText: label })
    .first()
  await expect(actionBtn).toBeVisible()
  await actionBtn.click()
  await page.waitForTimeout(500)
}
