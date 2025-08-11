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

  test('labels reflect current selection', async ({ page }) => {
    await expect(page.locator('[data-role="label-board"]')).toHaveText('Default Board');
    await expect(page.locator('[data-role="label-view"]')).toHaveText('Default View');
  });

  test('hover opens side dropdowns', async ({ page }) => {
    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="menu-board"]');
    await expect(page.locator('[data-testid="submenu-boards"]')).toBeVisible();
    await page.hover('[data-testid="menu-view"]');
    await expect(page.locator('[data-testid="submenu-views"]')).toBeVisible();
  });

  test('actions wired', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());

    await handleDialog(page, 'prompt', 'SM Board');
    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="menu-board"]');
    await page.click('[data-testid="submenu-boards"] [data-action="create"]');
    let boards = await getConfigBoards(page);
    expect(boards.some(b => b.name === 'SM Board')).toBeTruthy();

    await handleDialog(page, 'prompt', 'SM Renamed');
    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="menu-board"]');
    await page.click('[data-testid="submenu-boards"] [data-action="rename"]');
    await expect(page.locator('#board-selector option:checked')).toHaveText('SM Renamed');

    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="menu-board"]');
    await page.click('[data-testid="submenu-boards"] [data-action="delete"]');
    boards = await getConfigBoards(page);
    expect(boards.some(b => b.name === 'SM Renamed')).toBeFalsy();

    await handleDialog(page, 'prompt', 'SM View');
    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="menu-view"]');
    await page.click('[data-testid="submenu-views"] [data-action="create"]');
    await expect(page.locator('#view-selector option:checked')).toHaveText('SM View');

    await handleDialog(page, 'prompt', 'SM View Renamed');
    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="menu-view"]');
    await page.click('[data-testid="submenu-views"] [data-action="rename"]');
    await expect(page.locator('#view-selector option:checked')).toHaveText('SM View Renamed');

    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="menu-view"]');
    await page.click('[data-testid="submenu-views"] [data-action="reset"]');
    await page.waitForFunction(() => document.querySelectorAll('.widget-wrapper').length === 0);
    await waitForWidgetStoreIdle(page);

    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="menu-view"]');
    await page.click('[data-testid="submenu-views"] [data-action="delete"]');
    await expect(page.locator('#view-selector option:checked')).not.toHaveText('SM View Renamed');
  });

  test('rename updates labels', async ({ page }) => {
    await handleDialog(page, 'prompt', 'Temp Board');
    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="menu-board"]');
    await page.click('[data-testid="submenu-boards"] [data-action="create"]');
    await handleDialog(page, 'prompt', 'Renamed Board');
    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="menu-board"]');
    await page.click('[data-testid="submenu-boards"] [data-action="rename"]');
    await expect(page.locator('[data-role="label-board"]')).toHaveText('Renamed Board');

    await handleDialog(page, 'prompt', 'Temp View');
    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="menu-view"]');
    await page.click('[data-testid="submenu-views"] [data-action="create"]');
    await handleDialog(page, 'prompt', 'Renamed View');
    await page.hover('[data-testid="service-menu"]');
    await page.hover('[data-testid="menu-view"]');
    await page.click('[data-testid="submenu-views"] [data-action="rename"]');
    await expect(page.locator('[data-role="label-view"]')).toHaveText('Renamed View');
  });

  test('keyboard controls', async ({ page }) => {
    await page.focus('#service-control');
    await page.keyboard.press('Enter');
    await page.focus('[data-testid="menu-view"] .submenu-trigger');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-testid="submenu-views"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="submenu-views"]')).not.toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#service-control')).not.toHaveClass(/open/);
  });
});
