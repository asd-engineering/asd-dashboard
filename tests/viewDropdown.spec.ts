import { test, expect } from '@playwright/test';
import { handleDialog, getBoardsFromLocalStorage } from './shared/common';
import { routeServicesConfig } from './shared/mocking';
import { addServices } from './shared/common';

const defaultViewName = "Default View"
const newViewName = "New View"
const renamedViewName = "Renamed View"

async function verifyCurrentViewName(page, expectedViewName) {
    const currentViewName = await page.locator('#view-selector option:checked').textContent();
    expect(currentViewName).toBe(expectedViewName);
}

test.describe('View Dropdown Functionality', () => {

  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/');
    await addServices(page, 2);
  });

  test('Create a new view', async ({ page }) => {
    await handleDialog(page, 'prompt', newViewName);
    await page.click('#view-dropdown .dropbtn');
    await page.click('#view-control a[data-action="create"]');

    const boards = await getBoardsFromLocalStorage(page);
    const currentBoardId = await page.locator('.board').getAttribute('id');
    const currentBoard = boards.find(board => board.id === currentBoardId);
    const newView = currentBoard.views.find(view => view.name === newViewName);

    expect(newView).toBeDefined();
  });

  test('should create a new view and set it as active', async ({ page }) => {
     // Set the prompt to return the new view name
    await handleDialog(page, 'prompt', newViewName);

    await page.click('#view-dropdown .dropbtn');
    await page.click('#view-control a[data-action="create"]');

    // **VERIFICATION**: Verify that the new view is the SELECTED option
    await verifyCurrentViewName(page, newViewName);

    // Verifieer dat de view correct is opgeslagen in localStorage
    const boards = await getBoardsFromLocalStorage(page);
    const currentBoardId = await page.locator('.board').getAttribute('id');
    const currentBoard = boards.find(board => board.id === currentBoardId);
    const newView = currentBoard.views.find(view => view.name === newViewName);
    expect(newView).toBeDefined();

    // Verify that 'lastUsedViewId' matches the new view
    const lastUsedViewId = await page.evaluate(() => localStorage.getItem('lastUsedViewId'));
    expect(lastUsedViewId).toBe(newView.id);
  });

  test('Rename a view', async ({ page }) => {
    // Verify the current view is the expected one
    await verifyCurrentViewName(page, defaultViewName);

    // Proceed with renaming
    await handleDialog(page, 'prompt', renamedViewName);
    await page.click('#view-dropdown .dropbtn');
    await page.click('#view-control a[data-action="rename"]');

    // Verify the view was renamed
    const boards = await getBoardsFromLocalStorage(page);
    const currentBoardId = await page.locator('.board').getAttribute('id');
    const currentBoard = boards.find(board => board.id === currentBoardId);
    const renamedView = currentBoard.views.find(view => view.name === renamedViewName);

    expect(renamedView).toBeDefined();
  });

  test('Delete a view', async ({ page }) => {
    // Verify the current view is the expected one
    await verifyCurrentViewName(page, defaultViewName);

    // Proceed with deletion
    await page.on('dialog', dialog => dialog.accept());
    await page.click('#view-dropdown .dropbtn');
    await page.click('#view-control a[data-action="delete"]');

    // Verify the view was deleted
    const boards = await getBoardsFromLocalStorage(page);
    const currentBoardId = await page.locator('.board').getAttribute('id');
    const currentBoard = boards.find(board => board.id === currentBoardId);
    const deletedView = currentBoard.views.find(view => view.name === defaultViewName);

    expect(deletedView).toBeUndefined();
  });

  test('Reset a view', async ({ page }) => {
    // Verify the current view is the expected one
    await verifyCurrentViewName(page, defaultViewName);

    // Proceed with reset
    await page.on('dialog', dialog => dialog.accept());
    await page.click('#view-dropdown .dropbtn');
    await page.click('#view-control a[data-action="reset"]');

    // Verify the view was reset
    const boards = await getBoardsFromLocalStorage(page);
    const currentBoardId = await page.locator('.board').getAttribute('id');
    const currentBoard = boards.find(board => board.id === currentBoardId);
    const resetView = currentBoard.views.find(view => view.name === defaultViewName);

    expect(resetView.widgetState.length).toBe(0);
  });

});
