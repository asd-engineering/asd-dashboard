import { test, expect } from './fixtures';
import { handleDialog, getBoardsFromLocalStorage} from './shared/common';
import { routeServicesConfig } from './shared/mocking';
import { addServices } from './shared/common';


const defaultBoardName = "Default Board"
const newBoardName = "New Test Board"

test.describe('Board Dropdown Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/');
    await addServices(page, 2);
  });

  test('should display board dropdown', async ({ page }) => {
    const boardDropdown = await page.locator('#board-dropdown .dropbtn');
    await expect(boardDropdown).toBeVisible();
  });

  test('should create a new board and set it as active', async ({ page }) => {
    // Handle the prompt dialog for board name input
    await handleDialog(page, 'prompt', newBoardName);

    await page.click('#board-dropdown .dropbtn');
    await page.click('#board-control a[data-action="create"]');

    const selectedBoardName = await page.locator('#board-selector option:checked').textContent();
    await expect(selectedBoardName).toBe(newBoardName);

    const boards = await getBoardsFromLocalStorage(page);
    const newBoard = boards.find(board => board.name === newBoardName);
    expect(newBoard).toBeDefined();

    const lastUsedBoardId = await page.evaluate(() => localStorage.getItem('lastUsedBoardId'));
    expect(lastUsedBoardId).toBe(newBoard.id);
  });

  test('should rename an existing board', async ({ page }) => {
    // Handle the prompt dialog for new board name input
    await handleDialog(page, 'prompt', 'Renamed Board');

    // Assuming a board named 'Test Board' exists
    await page.click('#board-dropdown .dropbtn');
    await page.click('#board-control a[data-action="rename"]');

    // Assert that the board name is updated in the dropdown
    const boardSelector = await page.locator('#board-selector');
    await expect(boardSelector).toContainText('Renamed Board');

    // Verify localStorage is updated
    const boards = await getBoardsFromLocalStorage(page);
    expect(boards.some(board => board.name === 'Renamed Board')).toBeTruthy();
  });

  test('should delete a board', async ({ page }) => {
    // Confirm deletion
    await handleDialog(page, 'confirm');

    // Assuming a board named 'Test Board' exists
    await page.click('#board-dropdown .dropbtn');
    await page.click('#board-control a[data-action="delete"]');

    // Assert that the board is removed from the dropdown
    const boardSelector = await page.locator('#board-selector');
    await expect(boardSelector).not.toContainText(defaultBoardName);

    // Verify localStorage is updated
    const boards = await getBoardsFromLocalStorage(page);
    expect(boards.some(board => board.name === defaultBoardName)).toBeFalsy();
  });
});
