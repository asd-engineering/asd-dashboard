import { test, expect } from './fixtures';
import { routeServicesConfig } from './shared/mocking';
import { ciBoards } from './data/ciConfig.js';

test.describe('LocalStorage Editor Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      localStorage.setItem('log', 'localStorageModal,localStorage');
    });
    await page.waitForSelector('body[data-ready="true"]', { timeout: 2000 });
  });

  test('should open LocalStorage editor modal, modify JSON content, and save changes', async ({ page }) => {
    // Set an initial state for the test to modify. This makes the test self-contained.
    await page.evaluate(() => {
      localStorage.setItem('config', JSON.stringify({ globalSettings: { theme: 'dark' } }));
      localStorage.setItem('services', JSON.stringify([{ name: 'test', url: 'http://test.com' }]));
      localStorage.setItem('boards', JSON.stringify([{ id: 'board1', name: 'Board 1', views: [] }]));
    });

    // Reload the page to ensure the app reads the new localStorage state
    await page.reload();
    await page.waitForSelector('body[data-ready="true"]', { timeout: 10000 });

    // ================== FIX START ==================
    // Action 1: Click the button with the CORRECT ID to open the modal
    await page.click('#localStorage-edit-button');
    // =================== FIX END ===================

    // Now, we wait for the modal and its contents to be ready.
    const modal = page.locator('#localStorage-modal');
    await expect(modal).toBeVisible();

    // The modal generates multiple textareas. We need to target the one for the 'boards' key.
    const boardsTextarea = modal.locator('textarea#localStorage-boards');
    await expect(boardsTextarea).toBeVisible();

    // Action 2: It is now safe to interact with the textarea.
    const newBoardsContent = JSON.stringify([{ id: 'board2', name: 'Modified Board', views: [] }], null, 2);
    await boardsTextarea.fill(newBoardsContent);

    // Action 3: Click the save button within the modal.
    await modal.locator('button:has-text("Save")').click();

    // Wait for the modal to disappear, confirming the save action was successful.
    await expect(modal).toBeHidden();

    // Assertion: Verify the change was persisted correctly in localStorage.
    const newBoards = await page.evaluate(() => JSON.parse(localStorage.getItem('boards')));
    expect(newBoards).toHaveLength(1);
    expect(newBoards[0].name).toBe('Modified Board');
  });

  test('invalid JSON in popup shows error', async ({ page }) => {
    await page.click('#localStorage-edit-button');
    await page.waitForSelector('#localStorage-modal');
    const textarea = await page.locator('textarea#localStorage-boards');
    await textarea.fill('{broken');
    await page.click('button.modal__btn--save');
    await expect(page.locator('.user-notification span')).toHaveText(/Invalid JSON detected/);
    await expect(page.locator('#localStorage-modal')).toBeVisible();
  });
  

  // test('should log notification for invalid JSON and keep non-JSON values uneditable', async ({ page }) => {
  //   const logs: string[] = [];

  //   // Listen for console events
  //   page.on('console', msg => {
      
  //     if (['log', 'info', 'warn', 'error'].includes(msg.type())) {
  //       logs.push(msg.text());
  //     }
  //   });

  //   await page.evaluate(() => {
  //     localStorage.setItem('brokenJSON', '/////Te/////');
  //   });

  //   // // Open LocalStorage editor
  //   await page.click('#localStorage-edit-button');
  //   console.log(`Kelvin ${logs}`);

  //   const localStorageNonJSONErrors = logs.find(log => log.includes('Non-JSON value detected for key: brokenJSON'));
  //   expect(localStorageNonJSONErrors).toBeDefined();
  // });
});
