import { type Page, expect } from "@playwright/test";

export async function ensurePanelOpen(page: Page) {
  // Triggers a test-only hook in the app (if present) to open the panel,
  // then waits for the CSS "open" state to be applied.
  await page.evaluate(() => (window as any).__openWidgetPanel?.());
  await page.waitForSelector("#widget-selector-panel.open");
}

// Helper function to add services via the widget selector panel
/**
 * Add the first `count` services by clicking options in the widget selector panel.
 * Skips index 0 if it’s a placeholder/search row.
 */
export async function addServices(page: Page, count: number) {
  await ensurePanelOpen(page);
  // If your panel requires an explicit toggle click to render items, uncomment:
  // await page.click("#widget-dropdown-toggle");
  for (let i = 0; i < count; i++) {
    await page.locator("#widget-selector-panel .widget-option").nth(i + 1).click();
  }
}

/**
 * Select a service by its label using the widget selector panel.
 */
export async function selectServiceByName(page: Page, serviceName: string) {
  await ensurePanelOpen(page);
  // If a toggle is needed in your build, uncomment:
  // await page.click("#widget-dropdown-toggle");
  await page.click(`#widget-selector-panel .widget-option:has-text("${serviceName}")`);
}

/**
 * Navigates to the specified URL and waits until the dashboard is fully hydrated.
 *
 * This helper observes:
 *  - `main:ready` after core initialization (menu, config, etc)
 *  - `view:ready` after the active board/view is fully rendered
 *
 * It resolves either immediately if <body data-ready="true"> is set, or once one of the events fires.
 */
export async function navigate(
  page: Page,
  destination: string,
  gotoOptions?: Parameters<Page["goto"]>[1]
): Promise<void> {
  // Optional console proxy (kept commented to avoid noisy CI logs)
  // const allowedPrefixes = ['[navigate]', '[hydrate]', '[modal]']
  // page.on('console', msg => {
  //   const text = msg.text()
  //   if (msg.type() === 'log' && allowedPrefixes.some(p => text.startsWith(p))) {
  //     console.log(`[browser] ${text}`)
  //   }
  // })

  await page.goto(destination, gotoOptions);

  try {
    await page.waitForFunction(() => {
      // Fast path: view hydration already complete
      if (document.body.getAttribute("data-ready") === "true") {
        return true;
      }

      // Attach event listeners only once across retries
      if (!(document as any).__NAVIGATE_ATTACHED__) {
        (document as any).__NAVIGATE_ATTACHED__ = true;

        const handler = (e: Event) => {
          // console.log(`[navigate] resolved via ${e.type}`)
          (document as any).__NAVIGATE_READY__ = true;
        };

        document.addEventListener("main:ready", handler, { once: true });
        document.addEventListener("view:ready", handler, { once: true });
      }

      return !!(document as any).__NAVIGATE_READY__;
    }, { timeout: 100 });
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
  await page.evaluate(() => localStorage.clear());
}

export async function getUnwrappedConfig(page: Page) {
  return await page.evaluate(() => {
    const raw = localStorage.getItem("config");
    const parsed = raw ? JSON.parse(raw) : null;

    const cfg = (parsed as any)?.data || parsed;

    if (!cfg || typeof cfg !== "object") return { boards: [] };
    if (!Array.isArray(cfg.boards)) cfg.boards = [];

    return cfg;
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
  return await page.evaluate(() => localStorage.getItem("lastUsedViewId"));
}

export async function getLastUsedBoardId(page: Page) {
  return await page.evaluate(() => localStorage.getItem("lastUsedBoardId"));
}

// Select a view by its visible label and wait until the DOM reflects it.
export async function selectViewByLabel(page: Page, viewLabel: string) {
  // Wait until the view dropdown is populated
  await page.waitForFunction(
    (sel) => !!document.querySelector(sel) && (document.querySelector(sel) as HTMLSelectElement).options.length > 0,
    "#view-selector",
    { timeout: 5000 }
  );

  // Change the view
  await page.selectOption("#view-selector", { label: viewLabel });

  // Wait until the <div.board-view> id matches the selected value
  await page.waitForFunction(() => {
    const sel = document.querySelector("#view-selector") as HTMLSelectElement | null;
    const viewEl = document.querySelector(".board-view") as HTMLElement | null;
    return !!sel && !!viewEl && viewEl.id === sel.value;
  });
}
