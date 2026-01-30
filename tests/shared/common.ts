// common.ts
import { type Page, expect } from "@playwright/test";
import { ensurePanelOpen } from './panels'
import { waitForWidgetStoreIdle, evictIfModalPresent } from '../shared/state.js'

/**
 * Wait until the app signals readiness.
 * Uses DOMContentLoaded + body[data-ready="true"].
 * No waitForFunction.
 *
 * @param {Page} page Playwright page
 * @returns {Promise<void>}
 */
export async function waitForAppReady(page: import('@playwright/test').Page) {
  await page.waitForLoadState('domcontentloaded');
  // Use explicit timeout for CI stability (Firefox + IndexedDB init can be slow)
  await page.waitForSelector('body[data-ready="true"]', { timeout: 15000 });
}

/**
 * Safely run `page.evaluate` with one automatic retry if the page navigated and
 * destroyed the execution context (common right after snapshot switch/merge).
 *
 * Overloads match Playwright's evaluate:
 *  - No-arg page function
 *  - Single-arg page function
 *
 * @template R, Arg
 * @param {Page} page Playwright page
 * @param {(arg: Arg) => R | Promise<R>} fn Function executed in the page context
 * @param {Arg} [arg] Optional argument passed to `fn`
 * @returns {Promise<R>} The result of `fn`
 */
export async function evaluateSafe<R>(page: Page, fn: () => R | Promise<R>): Promise<R>;
export async function evaluateSafe<R, Arg>(page: Page, fn: (arg: Arg) => R | Promise<R>, arg: Arg): Promise<R>;
export async function evaluateSafe(page: Page, fn: (arg?: any) => any, arg?: any): Promise<any> {
  const run = () =>
    arg === undefined ? page.evaluate(fn as any) : page.evaluate(fn as any, arg);

  try {
    return await run();
  } catch (e: any) {
    // WebKit (and sometimes Chromium) throws this when a nav happens mid-evaluate
    if (/(Execution context was destroyed|Target closed|Navigation failed)/i.test(String(e?.message || ''))) {
      await waitForAppReady(page);
      return await run();
    }
    throw e;
  }
}

/**
 * Add the first `count` services by clicking options in the widget selector panel.
 */
export async function addServices(page: Page, count: number) {
  // If an eviction dialog is up from the previous add, resolve it first.
  await evictIfModalPresent(page, { appearTimeoutMs: 800, hideTimeoutMs: 2000 });

  for (let i = 0; i < count; i++) {
    // Re-open the panel (it may have auto-hidden).
    await ensurePanelOpen(page, 'service-panel');
    const row = page.locator('[data-testid="service-panel"] .panel-item').nth(i);
    await row.scrollIntoViewIfNeeded();
    await row.click();
  }
  // Let create+evict complete; handle any modal that appeared because of THIS click.
  await evictIfModalPresent(page, { appearTimeoutMs: 800, hideTimeoutMs: 2000 });
}

export async function selectServiceByName(page: Page, serviceName: string) {
  // Retry logic for Firefox flakiness with panel dropdowns
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await ensurePanelOpen(page, 'service-panel')
      const panel = page.locator('[data-testid="service-panel"]')
      const item = panel.locator(`.panel-item:has-text("${serviceName}")`)

      // Wait for item to be visible with shorter timeout
      await item.waitFor({ state: 'visible', timeout: 3000 })
      await item.scrollIntoViewIfNeeded({ timeout: 2000 })
      await item.click({ force: true })
      return
    } catch (e) {
      if (attempt === 2) throw e
      // Close any open dropdowns and retry
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
    }
  }
}

export interface NavigateOptions {
  /** Total budget for navigate (goto + readiness), in ms. Default: 6000 */
  totalTimeoutMs?: number;
  gotoOptions?: Parameters<Page['goto']>[1];
  debugConsole?: boolean;
  /** Disable readiness wait (skip app-ready selector), default: false */
  disableReadyWait?: boolean;
}

/**
 * Navigate and optionally wait for app readiness without waitForFunction.
 * - goto waits for 'domcontentloaded'
 * - readiness waits for 'body[data-ready="true"]' unless disabled
 */
export async function navigate(
  page: Page,
  destination: string,
  options?: NavigateOptions,
): Promise<void> {
  const totalBudget = Math.max(1, options?.totalTimeoutMs ?? 6000);
  const gotoBudget = Math.max(1, Math.floor(totalBudget * 0.5));
  const readyBudget = Math.max(0, totalBudget - gotoBudget);

  const callerGotoTimeout =
    options?.gotoOptions && typeof options.gotoOptions.timeout === 'number'
      ? options.gotoOptions.timeout
      : undefined;
  const finalGotoTimeout = Math.min(gotoBudget, callerGotoTimeout ?? gotoBudget);

  const mergedGotoOptions: Parameters<Page['goto']>[1] = {
    waitUntil: 'domcontentloaded',
    ...(options?.gotoOptions ?? {}),
    timeout: Math.min(gotoBudget, options?.gotoOptions?.timeout ?? gotoBudget),
  };

  // Two quick attempts – cheap and effective against cold starts in CI
  let ok = false;
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(destination, mergedGotoOptions);
      ok = true;
      break;
    } catch {
      // small, bounded retry; no sleeps
      if (i === 2) {
        // last resort: require 'load'
        await page.goto(destination, { ...mergedGotoOptions, waitUntil: 'load' });
        ok = true;
        break;
      }
    }
  }
  if (!ok) throw new Error(`navigate(): failed to goto ${destination} within ${finalGotoTimeout * 3}ms`);

  if (readyBudget === 0 || options?.disableReadyWait) return;

  // App readiness via selector only (no waitForFunction)
  await page.waitForSelector('body[data-ready="true"]', { timeout: readyBudget });
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

/**
 * Click a specific service multiple times using the widget selector panel.
 */
export async function addServicesByName(page: Page, serviceName: string, count: number, processEvict=false) {
  for (let i = 0; i < count; i++) {
    if(processEvict){
      await evictIfModalPresent(page)
    }
    await selectServiceByName(page, serviceName);
  }
}

export function b64(obj: any) {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

/**
 * Clear persisted dashboard data via StorageManager (not localStorage.clear()).
 * Leaves UI in a clean state for subsequent actions.
 */
export async function clearStorage(page: Page) {
  // Navigate to the app and wait for it to be ready
  await navigate(page, '/');
  // Clear storage and reinitialize
  await page.evaluate(async () => {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    // Delete IndexedDB and wait for completion
    await new Promise<void>(res => {
      const req = indexedDB.deleteDatabase('asd-db');
      req.onsuccess = req.onerror = req.onblocked = () => res();
    });
  });
  // Reload to get a fresh app state after storage was cleared
  // Firefox needs longer timeout for reload operations
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForSelector('body[data-ready="true"]', { timeout: 5000 }).catch(() => {});
}

/**
 * Flush all pending IndexedDB writes via StorageManager.flush().
 * Call this before page.reload() to ensure data is persisted.
 */
export async function flushStorage(page: Page) {
  await page.evaluate(async () => {
    const { StorageManager } = await import('/storage/StorageManager.js');
    await StorageManager.flush();
  });
}

/**
 * Read the dashboard config using StorageManager.
 * - Supports optional waitForReady gate
 */
export async function getUnwrappedConfig(
  page: import('@playwright/test').Page,
  opts?: { waitForReady?: boolean; timeoutMs?: number }
) {
  const timeoutMs = opts?.timeoutMs ?? 5000;

  if (opts?.waitForReady !== false) {
    await waitForAppReady(page);
  } else {
    await page.waitForLoadState('domcontentloaded');
  }

  const evalPromise = page.evaluate(async () => {
    const { StorageManager } = await import('/storage/StorageManager.js');
    return StorageManager.getConfig();
  });

  return await Promise.race([
    evalPromise,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`getUnwrappedConfig: timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * Read services via StorageManager.
 */
export async function getServices(
  page: import('@playwright/test').Page,
  opts?: { waitForReady?: boolean; timeoutMs?: number }
) {
  const timeoutMs = opts?.timeoutMs ?? 5000;

  if (opts?.waitForReady !== false) {
    await waitForAppReady(page);
  } else {
    await page.waitForLoadState('domcontentloaded');
  }

  const evalPromise = page.evaluate(async () => {
    const { StorageManager } = await import('/storage/StorageManager.js');
    return StorageManager.getServices();
  });

  return await Promise.race([
    evalPromise,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`getServices: timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export async function getConfigBoards(page: Page) {
  return await evaluateSafe(page, async () => {
    const { StorageManager } = await import('/storage/StorageManager.js');
    return StorageManager.getBoards();
  });
}


export async function getShowMenuWidgetFlag(page: Page) {
  const cfg = await getUnwrappedConfig(page);
  return cfg.globalSettings?.showMenuWidget ?? false;
}

/**
 * Read last used IDs via StorageManager.misc, not localStorage.
 */
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

/**
 * Fast view switch by label.
 * - Single action: force selectOption({ label }) — no clicks, no waits.
 * - Rare fallback: tiny evaluate to set value + dispatch events if selectOption fails.
 * - Callers are responsible for any readiness waits.
 */
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

export async function getConfigTheme(page: Page) {
  const cfg = await getUnwrappedConfig(page);
  return cfg.globalSettings?.theme || 'light';
}

export async function getBoardCount(page: Page) {
    const boards = await getConfigBoards(page);
    return boards.length;
}

/**
 * Set config and services via StorageManager, not localStorage.
 * Keeps StorageManager semantics (wrapping, defaults, migrations).
 */
export async function setConfigAndServices(
  page: Page,
  cfg: any,
  services: any[],
): Promise<void> {
  await page.evaluate(async ({ cfg, services }) => {
    const { StorageManager } = await import('/storage/StorageManager.js');
    StorageManager.setConfig(cfg);
    StorageManager.setServices(services as any);
  }, { cfg, services });
}

/**
 * Wipe config/services/lastUsed* but keep the snapshot store intact.
 * Mirrors the semantics used in reset/switch flows.
 */
export async function wipeConfigPreserveSnapshots(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const { StorageManager } = await import('/storage/StorageManager.js');
    StorageManager.clearAllExceptState();
  });
}

/**
 * Open config modal, switch to JSON mode, inject cfg JSON, Save, wait for SPA ready.
 */
export async function saveConfigJson(page: Page, cfg: any): Promise<void> {
  // Open (safely) + go JSON mode
  if (!(await page.locator('#config-modal').isVisible())) {
    await page.click('#open-config-modal');
  }
  await page.locator('#config-modal').waitFor({ state: 'visible' });
  await page.locator('button[data-tab="cfgTab"]').click();
  await page.locator('button:has-text("JSON mode")').click();

  // Fill + save
  const area = page.locator('#config-json');
  await area.waitFor();
  await area.fill(JSON.stringify(cfg));
  await page.locator('#config-modal .modal__btn--save').click();

  // App-ready (selector gate only, no waitForFunction)
  await waitForAppReady(page)
}

/**
 * Poll persisted config (via StorageManager) until boards.length >= min.
 */
export async function waitForStoredBoardsCount(page: Page, min = 1, timeout = 5000): Promise<void> {
  const start = Date.now();
  for (;;) {
    const cfg = await getUnwrappedConfig(page, { waitForReady: true, timeoutMs: Math.max(1, timeout - (Date.now() - start)) });
    const len = Array.isArray(cfg?.boards) ? cfg.boards.length : 0;
    if (len >= min) return;
    if (Date.now() - start > timeout) throw new Error(`waitForStoredBoardsCount: timed out waiting for >= ${min} (got ${len})`);
  }
}

/**
 * Switch board by label (fast select), no "click" races.
 */
export async function selectBoardByLabel(page: Page, label: string): Promise<void> {
  const sel = page.locator('#board-selector');
  await sel.selectOption({ label }, { force: true }).catch(async () => {
    await page.evaluate((lbl) => {
      const select = document.querySelector('#board-selector') as HTMLSelectElement | null;
      if (!select) throw new Error('#board-selector not found');
      const wanted = String(lbl).trim();
      const opt = Array.from(select.options).find(o => (o.textContent || '').trim() === wanted);
      if (!opt) throw new Error(`Board option "${wanted}" not found`);
      select.value = opt.value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, label);
  });
}

/**
 * Hover a panel row and click a flyout action ('rename' | 'delete' | 'navigate').
 */
export async function clickFlyoutAction(
  page: Page,
  panelTestId: 'service-panel' | 'board-panel' | 'view-panel',
  rowText: string,
  action: 'rename' | 'delete' | 'navigate'
): Promise<void> {
  await ensurePanelOpen(page, panelTestId);
  const row = page.locator(`[data-testid="${panelTestId}"] .panel-item`, { hasText: rowText }).first();
  await row.hover();
  const btn = row.locator(`[data-item-action="${action}"]`).first();
  await expect(btn).toBeVisible();
  await btn.click();
}

/**
 * Drag-and-drop between widget indices, using handle icons (stable selectors).
 */
export async function dragAndDropWidgetByIndex(page: Page, fromIndex: number, toIndex: number): Promise<void> {
  const src = `.widget-wrapper:nth-child(${fromIndex + 1}) .widget-icon-drag`;
  const dst = `.widget-wrapper:nth-child(${toIndex + 1}) .widget-icon-drag`;
  await page.dragAndDrop(src, dst);
}

export async function dragAndDropWidgetStable(page: Page, fromIndex: number, toIndex: number): Promise<void> {
  // Temporarily neutralize the header controls during DnD
  // Guard against a closed page because of page.reload after adding widgets (test)
  if (!page.isClosed()) {
    await page.evaluate(() => {
      const el = document.getElementById('controls') as HTMLElement | null
      if (el) {
        el.dataset.prevPointer = el.style.pointerEvents || ''
        el.style.pointerEvents = 'none'
      }
    })

    try {
      const src = page.locator('.widget-wrapper').nth(fromIndex).locator('.widget-icon-drag')
      const dst = page.locator('.widget-wrapper').nth(toIndex).locator('.widget-icon-drag')
      await src.scrollIntoViewIfNeeded()
      await dst.scrollIntoViewIfNeeded()
      const sb = await src.boundingBox()
      const db = await dst.boundingBox()
      if (!sb || !db) throw new Error('drag handles not found')

      await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2)
      await page.mouse.down()
      await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2, { steps: 10 })
      await page.mouse.up()
    } finally {
      await page.evaluate(() => {
        const el = document.getElementById('controls') as HTMLElement | null
        if (el) el.style.pointerEvents = el.dataset.prevPointer || ''
      })
    }
  }
}


/**
 * Assert visible widget count quickly (no extra waits).
 */
export async function expectWidgetCount(page: Page, n: number): Promise<void> {
  await expect(page.locator('.widget-wrapper:visible')).toHaveCount(n);
}

/**
 * Resize a widget to an exact grid via the block menu (deterministic).
 */
export async function resizeWidgetTo(page: Page, index: number, columns: number, rows: number): Promise<void> {
  const widget = page.locator('.widget-wrapper').nth(index);
  await widget.locator('.widget-icon-resize-block').hover();
  await page.click(`text=${columns} columns, ${rows} rows`);
  await expect(widget).toHaveAttribute('data-columns', String(columns));
  await expect(widget).toHaveAttribute('data-rows', String(rows));
}

export async function reloadReady(page: Page, totalTimeoutMs = 6000): Promise<void> {
    const gotoBudget = Math.max(1, Math.floor(totalTimeoutMs * 0.5));
    const readyBudget = Math.max(0, totalTimeoutMs - gotoBudget);
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: gotoBudget });
    } catch {
      // last try with 'load' in case DOMContentLoaded didn't fire in time
      await page.reload({ waitUntil: 'load', timeout: gotoBudget });
    }
    await page.waitForSelector('body[data-ready="true"]', { timeout: readyBudget });
}
