import { test, expect } from './fixtures';
import { addServices, handleDialog, getConfigBoards, navigate } from './shared/common';
import { routeServicesConfig } from './shared/mocking';
import { waitForWidgetStoreIdle } from './shared/state.js';

test.describe('Service menu', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page);
    await navigate(page, '/');
    await addServices(page, 1);
  });

  test('hover opens main menu sections', async ({ page }) => {
    await page.hover('[data-testid="service-menu"]');
    await expect(page.locator('#widget-selector-panel')).toBeVisible();
    await expect(page.locator('[data-testid="submenu-boards"]')).toBeVisible();
    await expect(page.locator('[data-testid="submenu-views"]')).toBeVisible();
  });

  test('create board via submenu', async ({ page }) => {
    await handleDialog(page, 'prompt', 'SM Board');
    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="submenu-boards"]');
    await page.click('[data-testid="submenu-boards"] [data-action="create"]');
    const boards = await getConfigBoards(page);
    expect(boards.some(b => b.name === 'SM Board')).toBeTruthy();
  });

  test('reset view via submenu', async ({ page }) => {
    await page.on('dialog', dialog => dialog.accept());
    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="submenu-views"]');
    await page.click('[data-testid="submenu-views"] [data-action="reset"]');
    await page.waitForFunction(() => document.querySelectorAll('.widget-wrapper').length === 0);
    await waitForWidgetStoreIdle(page);
  });

  test('escape closes submenus then menu', async ({ page }) => {
    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="submenu-boards"]');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="submenu-boards"] .dropdown-content')).not.toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#service-control')).not.toHaveClass(/open/);
  });
});
