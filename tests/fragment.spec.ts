import { test, expect } from "./fixtures";
import { ciConfig } from "./data/ciConfig";
import { ciServices } from "./data/ciServices";
import { gzipJsonToBase64url } from "../src/utils/compression.js";
import { evaluateSafe, waitForAppReady } from "./shared/common";

async function encode(obj) {
  return gzipJsonToBase64url(obj);
}

test.describe("Secure fragments loading configuration", () => {
  test("import modal pre-fills name and saves snapshot", async ({ page }) => {
    // Navigate first, then set up storage (not via addInitScript)
    await page.goto('/')

    // Clear and seed storage manually
    await page.evaluate(async () => {
      localStorage.clear()
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('asd-db')
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      })
      await new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open('asd-db', 1)
        openRequest.onupgradeneeded = () => {
          const db = openRequest.result
          for (const name of ['config', 'boards', 'services', 'meta', 'state_store']) {
            if (!db.objectStoreNames.contains(name)) db.createObjectStore(name)
          }
        }
        openRequest.onsuccess = () => {
          const db = openRequest.result
          const tx = db.transaction(['config', 'boards', 'services', 'meta'], 'readwrite')
          tx.objectStore('config').put({ globalSettings: { theme: 'dark' } }, 'v1')
          tx.objectStore('boards').put([], 'v1')
          tx.objectStore('services').put([], 'v1')
          tx.objectStore('meta').put(true, 'migrated')
          tx.oncomplete = () => { db.close(); resolve() }
          tx.onerror = () => { db.close(); reject(tx.error) }
        }
        openRequest.onerror = () => reject(openRequest.error)
      })
    })

    const cfg = await encode(ciConfig);
    const svc = await encode(ciServices);
    const name = "MySnapshot";

    // Navigate with fragment - triggers the fragment decision modal
    await page.goto(`/#cfg=${cfg}&svc=${svc}&name=${encodeURIComponent(name)}`, { waitUntil: 'domcontentloaded' })

    await page.waitForSelector("#fragment-decision-modal");
    await expect(page.locator("#importName")).toHaveValue(name);

    // Click switch - wait for reload
    await Promise.all([
      page.waitForEvent('load'),
      page.locator('#switch-environment').click()
    ])
    await waitForAppReady(page)
    
    // Wait for a stable element on the new page to appear.
    await page.waitForSelector('[data-testid="board-panel"]');

    // Now re-import StorageManager in a fresh JS context
    const result = await evaluateSafe(page, async () => {
      const sm = (await import("/storage/StorageManager.js")).StorageManager;
      // Ensure any pending writes are complete
      await sm.flush();
      const store = await sm.loadStateStore();
      const snapshot = store.states.find(
        (s: any) => s.name === "MySnapshot",
      );
      return snapshot;
    });

    expect(result?.name).toBe(name);
    expect(result?.type).toBe("imported");
  });
});