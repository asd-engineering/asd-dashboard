// --- tests/shared/bootState.ts ---
// @ts-check
import { type Page } from "@playwright/test";

// Minimal globalSettings to ensure config is not detected as "empty"
const MIN_GLOBAL_SETTINGS = {
  globalSettings: {
    theme: 'light',
    widgetStoreUrl: [],
    database: 'localStorage',
    views: { showViewOptionsAsButtons: false, viewToShow: '' },
    localStorage: { enabled: 'true', loadDashboardFromConfig: 'true' }
  },
  serviceTemplates: {
    default: { type: 'iframe', maxInstances: 1, config: {} }
  }
};

/**
 * Boot the app with optional pre-injected storage state (IndexedDB),
 * before any app JS runs. When `inject=false`, the app boots cold
 * (no config/services in IDB), which is required to test the
 * fallback Config Modal flow.
 */
export async function bootWithDashboardState(
  page: Page,
  cfg: any,
  services: any[],
  last: { board: string; view: string },
  url = "/",
  options: { waitForReady?: boolean; inject?: boolean } = { waitForReady: true, inject: true }
): Promise<void> {
  const waitForReady = options.waitForReady !== false;
  const inject = options.inject !== false;

  // Only merge with minimal settings if config has meaningful content (boards, globalSettings, etc.)
  // Empty configs {} should remain empty so the "no config" modal appears
  const hasMeaningfulContent = cfg.boards?.length > 0 || cfg.globalSettings || cfg.serviceTemplates;
  const mergedCfg = hasMeaningfulContent
    ? {
        ...MIN_GLOBAL_SETTINGS,
        ...cfg,
        globalSettings: { ...MIN_GLOBAL_SETTINGS.globalSettings, ...(cfg.globalSettings || {}) }
      }
    : cfg;

  // Always start from a clean storage baseline for determinism
  await page.addInitScript(async () => {
    localStorage.clear();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("asd-db");
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    });
  });

  if (inject) {
    await page.addInitScript(
      async ({ cfg, services, last }) => {
        // Seed IndexedDB before the app starts
        await new Promise<void>((resolve, reject) => {
          const openRequest = indexedDB.open("asd-db", 1);

          openRequest.onupgradeneeded = () => {
            const db = openRequest.result;
            for (const name of ["config", "boards", "services", "meta", "state_store"]) {
              if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
            }
          };

          openRequest.onerror = () => reject(openRequest.error);
          openRequest.onsuccess = () => {
            const db = openRequest.result;
            const tx = db.transaction(["config", "boards", "services", "meta"], "readwrite");

            // IMPORTANT: boards live in their own store
            const boards = (cfg as any).boards || [];
            const configOnly = { ...cfg };
            delete (configOnly as any).boards;

            tx.objectStore("config").put(configOnly, "v1");
            tx.objectStore("boards").put(boards, "v1");
            tx.objectStore("services").put(services, "v1");
            tx.objectStore("meta").put(true, "migrated");
            tx.objectStore("meta").put(last.board, "lastUsedBoardId");
            tx.objectStore("meta").put(last.view, "lastUsedViewId");

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
      { cfg: mergedCfg, services, last }
    );
  }

  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (waitForReady) {
    await page.waitForFunction(() => document.body.dataset.ready === "true");
  }
}

/**
 * Convenience: boot with a truly empty state (no IDB seeding).
 * Use this for "fallback modal appears when no config exists".
 */
export async function bootWithEmptyState(
  page: Page,
  url = "/",
  options: { waitForReady?: boolean } = { waitForReady: true }
): Promise<void> {
  await bootWithDashboardState(page, {}, [], { board: "", view: "" }, url, { ...options, inject: false });
}
