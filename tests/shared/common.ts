// --- tests/shared/common.ts ---
import { type Page } from "@playwright/test";
import { ensurePanelOpen } from './panels'

export async function addServices(page: Page, count: number) {
  await ensurePanelOpen(page, 'service-panel')
  for (let i = 0; i < count; i++) {
    await page.locator('[data-testid="service-panel"] .panel-item').nth(i).click();
  }
}

export async function selectServiceByName(page: Page, serviceName: string) {
  await ensurePanelOpen(page, 'service-panel')
  await page.click(`[data-testid="service-panel"] .panel-item:has-text("${serviceName}")`);
}

export interface NavigateOptions {
  totalTimeoutMs?: number;
  gotoOptions?: Parameters<Page['goto']>[1];
  debugConsole?: boolean;
}

export async function navigate(
  page: Page,
  destination: string,
  options?: NavigateOptions,
): Promise<void> {
  const totalBudget = Math.max(1, options?.totalTimeoutMs ?? 2000);

  if (options?.debugConsole) {
    page.on('console', msg => console.log(`[browser] ${msg.text()}`));
  }

  const gotoBudget = Math.floor(totalBudget * 0.7);
  const readyBudget = totalBudget - gotoBudget;

  const mergedGotoOptions: Parameters<Page['goto']>[1] = {
    waitUntil: 'domcontentloaded',
    ...(options?.gotoOptions ?? {}),
    timeout: Math.min(gotoBudget, options?.gotoOptions?.timeout ?? gotoBudget),
  };

  await page.goto(destination, mergedGotoOptions);

  try {
    // Wait for the main application logic to signal it's ready.
    await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: readyBudget });
  } catch {
    // Soft timeout: continue; some tests may rely on explicit waits later
  }
}

// Helper function to handle dialog interactions
export async function handleDialog(page: Page, type: string, inputText = "") {
  page.on("dialog", async (dialog) => {
    if (dialog.type() === type) {
      if (inputText) {
        await dialog.accept(inputText);
      } else {
        await dialog.accept();
      }
    }
  });
}

export function b64(obj: any) {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

export async function clearStorage(page: Page) {
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise(res => {
      const req = indexedDB.deleteDatabase('asd-db');
      req.onsuccess = req.onerror = req.onblocked = () => res(null);
    });
  });
  // Navigate to a blank page and then to the app to ensure a full reset
  await page.goto('about:blank');
  await navigate(page, '/');
}

export async function getUnwrappedConfig(page: Page) {
  return await page.evaluate(async () => {
    const { StorageManager } = await import('/storage/StorageManager.js');
    // The main.js flow ensures SM is initialized, so we don't need to call init() here.
    return StorageManager.getConfig();
  });
}

export async function getConfigBoards(page: Page) {
  return await page.evaluate(async () => {
    const { StorageManager } = await import('/storage/StorageManager.js');
    return StorageManager.getBoards();
  });
}


export async function getShowMenuWidgetFlag(page: Page) {
  const cfg = await getUnwrappedConfig(page);
  return cfg.globalSettings?.showMenuWidget ?? false;
}

export async function getLastUsedViewId(page: Page) {
  return await page.evaluate(async () => {
    const { StorageManager } = await import('/storage/StorageManager.js');
    return StorageManager.misc.getLastViewId();
  });
}

export async function getLastUsedBoardId(page: Page) {
  return await page.evaluate(async () => {
    const { StorageManager } = await import('/storage/StorageManager.js');
    return StorageManager.misc.getLastBoardId();
  });
}

export async function selectViewByLabel(page: Page, label: string): Promise<void> {
  const sel = page.locator("#view-selector");
  try {
    await sel.selectOption({ label }, { force: true });
    return;
  } catch {
    await page.evaluate((lbl) => {
      const select = document.querySelector("#view-selector") as HTMLSelectElement | null;
      if (!select) throw new Error("#view-selector not found");
      const opt = Array.from(select.options).find(o => (o.textContent || "").trim() === String(lbl).trim());
      if (!opt) throw new Error(`Option with label "${lbl}" not found`);
      select.value = opt.value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }, label);
  }
}

/**
 * Waits for a specific StorageManager update to complete.
 * This is the key to solving async persistence failures.
 * @param page The Playwright page object.
 * @param reason The 'reason' string from the appStateChanged event detail.
 */
export async function waitForStorageUpdate(page: Page, reason: string) {
  await page.evaluate((reason) => 
    new Promise(resolve => {
      window.addEventListener('appStateChanged', function listener(e) {
        if ((e as CustomEvent).detail.reason === reason) {
          window.removeEventListener('appStateChanged', listener);
          resolve(true);
        }
      });
    }),
    reason
  );
}

export async function addServicesByName(page: Page, serviceName: string, count: number) {
  for (let i = 0; i < count; i++) {
    await selectServiceByName(page, serviceName);
  }
}

export async function getConfigTheme(page: Page) {
  const cfg = await getUnwrappedConfig(page);
  return cfg.globalSettings?.theme || 'light';
}

export async function getBoardCount(page: Page) {
    const boards = await getConfigBoards(page);
    return boards.length;
}