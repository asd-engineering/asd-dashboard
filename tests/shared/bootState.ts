// --- tests/shared/bootState.ts ---
// @ts-check
import { type Page } from "@playwright/test";

/**
 * Injects dashboard state directly into IndexedDB *before* the first byte of
 * app JS executes, then navigates to the provided URL so the SPA bootstraps
 * with that state. This is the most reliable way to set up test state.
 */
export async function bootWithDashboardState(
  page: Page,
  cfg: any,
  services: any[],
  last: { board: string; view: string },
  url = "/",
  options: { waitForReady?: boolean } = { waitForReady: true } // Add options parameter
): Promise<void> {
  await page.addInitScript(
    async ({ cfg, services, last }) => {
      // This script runs in the browser's context before the app starts.
      await new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open('asd-db', 1);

        openRequest.onupgradeneeded = () => {
          const db = openRequest.result;
          if (!db.objectStoreNames.contains('config')) db.createObjectStore('config');
          if (!db.objectStoreNames.contains('boards')) db.createObjectStore('boards');
          if (!db.objectStoreNames.contains('services')) db.createObjectStore('services');
          if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
          if (!db.objectStoreNames.contains('state_store')) db.createObjectStore('state_store');
        };

        openRequest.onerror = () => reject(openRequest.error);

        openRequest.onsuccess = () => {
          const db = openRequest.result;
          const tx = db.transaction(['config', 'boards', 'services', 'meta'], 'readwrite');
          
          // CRITICAL FIX: The new StorageManager expects boards to be separate from the main config.
          const boards = (cfg as any).boards || [];
          const configOnly = { ...cfg };
          delete (configOnly as any).boards;

          tx.objectStore('config').put(configOnly, 'v1');
          tx.objectStore('boards').put(boards, 'v1');
          tx.objectStore('services').put(services, 'v1');
          tx.objectStore('meta').put(true, 'migrated'); 
          tx.objectStore('meta').put(last.board, 'lastUsedBoardId');
          tx.objectStore('meta').put(last.view, 'lastUsedViewId');

          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
      });
    },
    { cfg, services, last },
  );

  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (options.waitForReady) {
    await page.waitForFunction(() => document.body.dataset.ready === 'true');
  }
}