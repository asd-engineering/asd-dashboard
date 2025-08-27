import { type Page, expect } from "@playwright/test";
import { ensurePanelOpen } from './panels'

// Helper function to add services via the widget selector panel
/**
 * Add the first `count` services by clicking options in the widget selector panel.
 * Skips index 0 if it’s a placeholder/search row.
 */
export async function addServices(page: Page, count: number) {
  await ensurePanelOpen(page, 'service-panel')
  for (let i = 0; i < count; i++) {
    await page.locator('[data-testid="service-panel"] .panel-item').nth(i).click();
  }
}

/**
 * Select a service by its label using the widget selector panel.
 */
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
  options?: NavigateOptions
): Promise<void> {
  const totalBudget = Math.max(1, options?.totalTimeoutMs ?? 2000);

  if (options?.debugConsole) {
    page.on('console', msg => console.log(`[browser] ${msg.text()}`));
  }

  const gotoBudget = Math.max(1, Math.floor(totalBudget * 0.7));
  const readyBudget = Math.max(0, totalBudget - gotoBudget);

  const mergedGotoOptions: Parameters<Page['goto']>[1] = {
    waitUntil: 'domcontentloaded',
    ...(options?.gotoOptions ?? {}),
    timeout: Math.min(gotoBudget, options?.gotoOptions?.timeout ?? gotoBudget),
  };

  await page.goto(destination, mergedGotoOptions);

  if (readyBudget === 0) return;

  try {
    await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: readyBudget });
  } catch {
    // Soft timeout
  }
}

// Helper function to handle dialog interactions
export async function handleDialog(page: Page, type: string, inputText = "") {
  page.on("dialog", async (dialog) => {
    expect(dialog.type()).toBe(type);
    if (type === "prompt") {
      await dialog.accept(inputText);
    } else {
      await dialog.accept();
    }
  });
}

/**
 * Click a specific service multiple times using the widget selector panel.
 */
export async function addServicesByName(page: Page, serviceName: string, count: number) {
  for (let i = 0; i < count; i++) {
    await selectServiceByName(page, serviceName);
  }
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
  await page.goto('/'); // Navigate after clearing to ensure a fresh start
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
}

export async function getUnwrappedConfig(page: Page) {
  return await page.evaluate(async () => {
    const { StorageManager } = await import('/storage/StorageManager.js');
    return StorageManager.getConfig();
  });
}

export async function getConfigBoards(page: Page) {
  const cfg = await getUnwrappedConfig(page);
  return Array.isArray(cfg.boards) ? cfg.boards : [];
}

export async function getConfigTheme(page: Page) {
  const cfg = await getUnwrappedConfig(page);
  return cfg?.globalSettings?.theme;
}

export async function getBoardWithWidgets(page: Page) {
  const cfg = await getUnwrappedConfig(page);
  const boards = Array.isArray(cfg.boards) ? cfg.boards : [];
  return (
    boards.find((b) => b.views?.some((v) => v.widgetState?.length > 0))?.id ||
    null
  );
}

export async function getBoardCount(page: Page) {
  const cfg = await getUnwrappedConfig(page);
  return Array.isArray(cfg.boards) ? cfg.boards.length : 0;
}

export async function getShowMenuWidgetFlag(page: Page) {
  const cfg = await getUnwrappedConfig(page);
  return !!cfg?.globalSettings?.showMenuWidget;
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