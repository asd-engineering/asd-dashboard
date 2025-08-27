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
  cfg: object,
  services: object[],
  last: { board: string; view: string },
  url = "/",
): Promise<void> {
  await page.addInitScript(
    async ({ cfg, services, last }) => {
      // This script runs in the browser before the app starts.
      // We are directly populating the IndexedDB database.
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

          tx.objectStore('config').put(cfg, 'v1');
          tx.objectStore('services').put(services, 'v1');
          tx.objectStore('boards').put((cfg as any).boards || [], 'v1');
          tx.objectStore('meta').put(true, 'migrated'); // Mark as migrated to skip legacy logic
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

  // Cold-boot the real app.
  await page.goto(url, { waitUntil: "domcontentloaded" });
}