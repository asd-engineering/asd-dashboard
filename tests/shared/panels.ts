import { expect, Page } from '@playwright/test'

export async function ensurePanelOpen (page: Page, panelTestId: string) {
  const panel = page.locator(`[data-testid="${panelTestId}"]`)
  const dropdown = panel.locator('.dropdown-content')

  // Try hover first
  await panel.hover()

  // If dropdown not visible after hover, click to toggle .open class
  if (!await dropdown.isVisible().catch(() => false)) {
    await panel.click()
  }

  await expect(dropdown).toBeVisible({ timeout: 2000 })
}

export async function openCreateFromTopMenu (page: Page, panelTestId: 'service-panel' | 'board-panel' | 'view-panel', label: string) {
  await ensurePanelOpen(page, panelTestId)
  const menu = page.locator(`[data-testid="${panelTestId}"] .menu`)
  // Target specific action buttons to avoid misfiring on wrapper rows
  const directBtn = menu.locator('[data-menu-action]', { hasText: label }).first()
  if (await directBtn.count()) {
    await directBtn.waitFor({ state: 'visible' }).catch(() => {})
    await directBtn.click()
    return
  }
  const submenu = menu.locator('.menu-item').first()
  await submenu.hover()
  const actionBtn = submenu.locator('[data-menu-action]', { hasText: label }).first()
  await expect(actionBtn).toBeVisible()
  await actionBtn.click()
}
