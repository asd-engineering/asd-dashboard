import { type Page, expect } from "@playwright/test";
import { ensurePanelOpen } from './panels'

// Helper function to add services via the widget selector panel
/**
 * Add the first `count` services by clicking options in the widget selector panel.
 * Skips index 0 if it’s a placeholder/search row.
 */
export async function addServices(page: Page, count: number) {
  await ensurePanelOpen(page, 'service-panel')
  // If your panel requires an explicit toggle click to render items, uncomment:
  // await page.click("#widget-dropdown-toggle");
  for (let i = 0; i < count; i++) {
    await page.locator('[data-testid="service-panel"] .panel-item').nth(i).click();
  }
}

/**
 * Select a service by its label using the widget selector panel.
 */
export async function selectServiceByName(page: Page, serviceName: string) {
  await ensurePanelOpen(page, 'service-panel')
  // If a toggle is needed in your build, uncomment:
  // await page.click("#widget-dropdown-toggle");
  await page.click(`[data-testid="service-panel"] .panel-item:has-text("${serviceName}")`);
}

export interface NavigateOptions {
  /** Total budget for navigate (goto + readiness), in ms. Default: 1000 */
  totalTimeoutMs?: number;
  /** Additional options forwarded to page.goto (merged, not replaced) */
  gotoOptions?: Parameters<Page['goto']>[1];
  /** Enable console proxy for debugging, default: false */
  debugConsole?: boolean;
}

export async function navigate(
  page: Page,
  destination: string,
  options?: NavigateOptions
): Promise<void> {
  const totalBudget = Math.max(1, options?.totalTimeoutMs ?? 2000);

  // Optional console proxy
  if (options?.debugConsole) {
    const allowedPrefixes = ['[navigate]', '[hydrate]', '[modal]'];
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'log' && allowedPrefixes.some(p => text.startsWith(p))) {
        console.log(`[browser] ${text}`);
      }
    });
  }

  const gotoBudget = Math.max(1, Math.floor(totalBudget * 0.7));
  const readyBudget = Math.max(0, totalBudget - gotoBudget);

  const callerGotoTimeout =
    options?.gotoOptions && typeof options.gotoOptions.timeout === 'number'
      ? options.gotoOptions.timeout
      : undefined;
  const finalGotoTimeout = Math.min(gotoBudget, callerGotoTimeout ?? gotoBudget);

  const mergedGotoOptions: Parameters<Page['goto']>[1] = {
    waitUntil: 'domcontentloaded',
    ...(options?.gotoOptions ?? {}),
    timeout: finalGotoTimeout,
  };

  await page.goto(destination, mergedGotoOptions);

  if (readyBudget === 0) return;

  try {
    await page.waitForFunction(
      () => {
        if (document.body.getAttribute('data-ready') === 'true') return true;

        if (!(document as any).__NAVIGATE_ATTACHED__) {
          (document as any).__NAVIGATE_ATTACHED__ = true;
          const handler = () => {
            (document as any).__NAVIGATE_READY__ = true;
          };
          document.addEventListener('main:ready', handler, { once: true });
          document.addEventListener('view:ready', handler, { once: true });
        }

        return !!(document as any).__NAVIGATE_READY__;
      },
      { timeout: readyBudget }
    );
  } catch {
    // Soft timeout: continue; some tests may rely on explicit waits later
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
  await navigate(page, "/");
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise(res => {
      const req = indexedDB.deleteDatabase('asd-db');
      req.onsuccess = req.onerror = req.onblocked = () => res(null);
    });
  });
  // wait for any startup notifications to disappear to avoid intercepting clicks
  await page.waitForSelector('dialog.user-notification', { state: 'detached' }).catch(() => {});
}

export async function getUnwrappedConfig(page: Page) {
  return await page.evaluate(async () => {
    const { StorageManager: sm } = await import('/storage/StorageManager.js');
    return sm.getConfig();
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
    const { StorageManager: sm } = await import('/storage/StorageManager.js');
    return sm.misc.getLastViewId();
  });
}

export async function getLastUsedBoardId(page: Page) {
  return await page.evaluate(async () => {
    const { StorageManager: sm } = await import('/storage/StorageManager.js');
    return sm.misc.getLastBoardId();
  });
}

/**
 * Fast view switch by label.
 * - Single action: force selectOption({ label }) — no clicks, no waits.
 * - Rare fallback: tiny evaluate to set value + dispatch events if selectOption fails.
 * - Callers are responsible for any readiness waits (e.g., waitForWidgetStoreIdle()).
 */
export async function selectViewByLabel(page: Page, label: string): Promise<void> {
  const sel = page.locator("#view-selector");

  try {
    // Fast path: bypass actionability (visibility/enabled) checks entirely.
    await sel.selectOption({ label }, { force: true });
    return;
  } catch {
    // Minimal, last-resort fallback (runs only if selectOption throws).
    await page.evaluate((lbl) => {
      const select = document.querySelector("#view-selector") as HTMLSelectElement | null;
      if (!select) throw new Error("#view-selector not found");
      const wanted = String(lbl).trim();
      const opt = Array.from(select.options).find(
        (o) => (o.textContent || "").trim() === wanted
      );
      if (!opt) throw new Error(`Option with label "${wanted}" not found`);
      select.value = opt.value;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }, label);
  }
}