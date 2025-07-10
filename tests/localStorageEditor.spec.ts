import { test, expect } from './fixtures';
import { routeServicesConfig } from './shared/mocking';
import { ciBoards } from './data/ciConfig.js';
import { setLocalConfig, setLocalServices } from './shared/state.js';

test.describe('LocalStorage Editor Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js');
      sm.misc.setItem('log', 'localStorageModal,localStorage');
    });
    await page.waitForSelector('body[data-ready="true"]', { timeout: 2000 });
  });

  test('should open LocalStorage editor modal, modify JSON content, and save changes', async ({ page }) => {
    // Set an initial state for the test to modify. This makes the test self-contained.
    await setLocalConfig(page, {
      globalSettings: { theme: 'dark' },
      boards: [{ id: 'board1', name: 'Board 1', views: [] }]
    });
    await setLocalServices(page, [{ name: 'test', url: 'http://test.com' }]);

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

    // The modal generates multiple textareas. We target the one for the 'services' key.
    const servicesTextarea = modal.locator('textarea#localStorage-services');
    await expect(servicesTextarea).toBeVisible();

    // Action 2: Modify the services entry.
    const newServicesContent = JSON.stringify([{ name: 'modified', url: 'http://mod.example' }], null, 2);
    await servicesTextarea.fill(newServicesContent);

    // Action 3: Click the save button within the modal.
    await modal.locator('button:has-text("Save")').click();

    // Wait for the modal to disappear, confirming the save action was successful.
    await expect(modal).toBeHidden();

    // Assertion: Verify the change was persisted correctly in localStorage.
    const newServices = await page.evaluate(async () => {
      const { default: sm } = await import('/storage/StorageManager.js');
      return sm.getServices();
    });
    expect(newServices).toHaveLength(1);
    expect(newServices[0].name).toBe('modified');
  });

  test('invalid JSON in popup shows error', async ({ page }) => {
    await page.click('#localStorage-edit-button');
    await page.waitForSelector('#localStorage-modal');
    const textarea = await page.locator('textarea#localStorage-services');
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
