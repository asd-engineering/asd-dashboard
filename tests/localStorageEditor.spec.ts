import { test, expect } from '@playwright/test';
import { routeServicesConfig } from './shared/mocking';
import emojiList from '../src/ui/unicodeEmoji.js';
import { ciBoards } from './data/ciConfig.js';

test.describe('LocalStorage Editor Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      localStorage.setItem('log', 'localStorageModal,localStorage');
    });
  });

  test('should open LocalStorage editor modal, modify JSON content, and save changes', async ({ page, browserName  }) => {
    // Webkit (and a little Firefox) is flaky in this test so I increased the timeout only for that particular browser
    const timeout = ['webkit', 'firefox'].includes(browserName) ? 6000 : undefined;

    // Open LocalStorage editor
    await page.click('#localStorage-edit-button');
    
    // Wait for the modal to appear
    await page.waitForSelector('#localStorage-edit-button', { state: 'visible', timeout });
    
    // Verify modal is visible
    const modal = await page.locator('#localStorage-modal');
    await expect(modal).toBeVisible();
  
    // Verify Close button is present
    const closeButton = await modal.locator('button.lsm-cancel-button');
    await page.waitForSelector('button.lsm-cancel-button');
    await expect(closeButton).toBeVisible();
  
    // Modify the JSON content in the textarea to create a board, view, and widget
    const textarea = await modal.locator('textarea#localStorage-boards');
    await page.waitForSelector('textarea#localStorage-boards');
  
    const originalContent = await textarea.inputValue();
    const newContent = JSON.stringify(ciBoards, null, 2);
    await textarea.fill(newContent);
  
    // Save changes
    const saveButton = await modal.locator('button.lsm-save-button');
    await page.waitForSelector('button.lsm-save-button');
    await saveButton.click();
  
    // Wait for notification
    const notification = await page.locator('.user-notification span');
    await page.waitForSelector('.user-notification span', { state: 'visible', timeout });
    await expect(notification).toHaveText('LocalStorage updated successfully!');
  
    // Verify changes in localStorage
    const updatedValue = await page.evaluate(() => {
      const item = localStorage.getItem('boards');
      return item ? JSON.parse(item) : [];
    });
    expect(updatedValue[0].id).toBe(ciBoards[0].id);

    // Test closing modal using Close button
    await closeButton.click();
    await expect(await page.locator('#localStorage-modal')).toBeHidden();
  
    // Reopen and test closing modal using Escape key
    await page.click('#localStorage-edit-button');
    await page.keyboard.press('Escape');
    await expect(page.locator('#localStorage-modal')).toBeHidden({ timeout });

    // Reload the page and verify changes in localStorage
    await page.reload();
    
    const boards = await page.evaluate(() => JSON.parse(localStorage.getItem('boards')));
    expect(boards[0].name).toBe('Modified Board 1');
    expect(boards[0].views[0].name).toBe('Modified View 1');
    expect(boards[0].views[0].widgetState[0].url).toBe('http://localhost:8000/asd/toolbox');
  
    // Verify the UI reflects the changes
    const boardName = await page.locator('#board-selector').textContent();
    expect(boardName).toContain('Modified Board 1');
    
    const viewName = await page.locator('#view-selector').textContent();
    expect(viewName).toContain('Modified View 1');
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
