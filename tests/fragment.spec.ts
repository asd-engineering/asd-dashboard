import { test, expect } from './fixtures';
import { ciConfig } from './data/ciConfig';
import { ciServices } from './data/ciServices';
import { gzipJsonToBase64url } from '../src/utils/compression.js';

async function encode(obj) {
  return gzipJsonToBase64url(obj);
}

test('import modal pre-fills name and saves snapshot', async ({ page }) => {
  // SETUP: Create pre-existing local data to trigger the modal.
  await page.goto('/'); // Go to a blank page first
  await page.evaluate(() => {
    localStorage.setItem('config', JSON.stringify({ globalSettings: { theme: 'dark' } }));
  });

  const cfg = await encode(ciConfig);
  const svc = await encode(ciServices);
  const name = 'MySnapshot';

  // Now navigate to the URL with the fragment. The modal will now appear.
  await page.goto(`/#cfg=${cfg}&svc=${svc}&name=${encodeURIComponent(name)}`);

  // The rest of your test assertions will now work.
  await page.waitForSelector('#fragment-decision-modal', { timeout: 5000 });
  await expect(page.locator('#importName')).toHaveValue(name);
  await page.locator('#fragment-decision-modal button:has-text("Overwrite")').click();
  await page.waitForLoadState('domcontentloaded');
  
  const store = await page.evaluate(async () => {
    // Note: Since this runs in the browser, use a dynamic import.
    const smModule = await import('/storage/StorageManager.js');
    return await smModule.default.loadStateStore();
  });

  expect(store.states[0].name).toBe(name);
  expect(store.states[0].type).toBe('imported');
});