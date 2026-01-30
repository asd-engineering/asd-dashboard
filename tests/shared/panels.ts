import { expect, Page } from '@playwright/test'

export async function ensurePanelOpen (page: Page, panelTestId: string) {
  const panel = page.locator(`[data-testid="${panelTestId}"]`)
  const dropdown = panel.locator('.dropdown-content')

  // Firefox headless has hover issues - use JavaScript to force open
  // First try hover (works reliably in Chromium)
  await panel.hover({ force: true })
  await page.waitForTimeout(150)

  // If not visible, use JavaScript to add 'open' class directly
  if (!await dropdown.isVisible().catch(() => false)) {
    await panel.evaluate((el) => {
      el.classList.add('open')
      // Also trigger mouseenter to ensure any JS handlers run
      el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    })
    await page.waitForTimeout(150)
  }

  // Final fallback: click to toggle
  if (!await dropdown.isVisible().catch(() => false)) {
    await panel.click({ force: true })
    await page.waitForTimeout(150)
  }

  await expect(dropdown).toBeVisible({ timeout: 3000 })
}

export async function openCreateFromTopMenu (page: Page, panelTestId: 'service-panel' | 'board-panel' | 'view-panel', label: string) {
  // Retry logic for flaky Firefox hover menus
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await ensurePanelOpen(page, panelTestId)
      const menu = page.locator(`[data-testid="${panelTestId}"] .menu`)
      // Target specific action buttons to avoid misfiring on wrapper rows
      const directBtn = menu.locator('[data-menu-action]', { hasText: label }).first()
      if (await directBtn.count()) {
        await directBtn.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {})
        if (await directBtn.isVisible()) {
          await directBtn.click({ force: true })
          return
        }
      }
      const submenu = menu.locator('.menu-item').first()
      await submenu.hover({ force: true })
      await page.waitForTimeout(100)
      const actionBtn = submenu.locator('[data-menu-action]', { hasText: label }).first()
      await expect(actionBtn).toBeVisible({ timeout: 2000 })
      await actionBtn.click({ force: true })
      return
    } catch (e) {
      if (attempt === 2) throw e
      // Press Escape to close any open menus before retry
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
  }
}
