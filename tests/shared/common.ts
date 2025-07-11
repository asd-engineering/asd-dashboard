import { type Page, expect } from "@playwright/test";

// Helper function to add services
/**
 *
 * @param page
 * @param count
 */
export async function addServices(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await page.selectOption("#service-selector", { index: i + 1 });
    await page.click("#add-widget-button");
  }
}

/**
 * Select a service by its label and click the add widget button.
 *
 * @param {Page} page - Playwright page instance.
 * @param {string} serviceName - Service display name.
 * @returns {Promise<void>} Resolves when the widget is added.
 */
export async function selectServiceByName(page: Page, serviceName: string) {
  // wait until the <select> actually holds options
  await page.waitForFunction(
    (sel) => document.querySelector(sel)?.querySelectorAll("option").length > 0,
    "#service-selector",
    { timeout: 5000 },
  );
  await page.selectOption("#service-selector", { label: serviceName });
  await page.click("#add-widget-button");
}

/**
 * Change the current view by selecting it from the dropdown and
 * wait until the DOM reflects the new active view.
 *
 * @param {Page} page - Playwright page instance.
 * @param {string} viewLabel - Visible name of the view to select.
 * @returns {Promise<void>} Resolves when the view is switched.
 */
export async function selectViewByLabel(page: Page, viewLabel: string) {
  await page.waitForFunction(
    (sel) => document.querySelector(sel)?.querySelectorAll("option").length > 0,
    "#view-selector",
    { timeout: 5000 },
  );
  await page.selectOption("#view-selector", { label: viewLabel });
}

/**
 * Navigates to the specified URL and waits until the dashboard is fully hydrated.
 *
 * This helper observes two events emitted by the dashboard:
 *   - `main:ready` is fired after core initialization finishes (menu, drag/drop, config)
 *   - `view:ready` is fired after the active board/view is fully rendered (widgets hydrated)
 *
 * It resolves in one of two ways:
 *   1. Immediately if `<body>` already has the `data-view-id` attribute (fast path)
 *   2. After either `main:ready` or `view:ready` is emitted (whichever comes first)
 *
 * Only one listener wins — both events are attached once, and the first one to fire resolves.
 * A shared DOM flag ensures listeners are attached only once, even if Playwright re-evaluates.
 *
 * Console logs prefixed with `[navigate]` are forwarded from the browser to aid debugging.
 *
 * @param {import('@playwright/test').Page} page - Playwright Page instance.
 * @param {string} destination - URL to navigate to.
 * @param {import('@playwright/test').WaitForURLOptions} [gotoOptions] - Optional Playwright `goto` options.
 * @returns {Promise<void>} Resolves when hydration is detected via event or DOM.
 */
export async function navigate(
  page: Page,
  destination: string,
  gotoOptions?: Parameters<Page['goto']>[1]
): Promise<void> {
  const allowedPrefixes = ['[navigate]', '[hydrate]', '[modal]']
  page.on('console', msg => {
    const text = msg.text()
    if (msg.type() === 'log' && allowedPrefixes.some(p => text.startsWith(p))) {
      console.log(`[browser] ${text}`)
    }
  })

  await page.goto(destination, gotoOptions)

  try {
    await page.waitForFunction(() => {
      // Fast path: view hydration already complete
      if (document.body.hasAttribute('data-view-id')) {
        console.log('[navigate] fast path: data-view-id present')
        return true
      }

      // Attach event listeners only once across retries
      if (!(document as any).__NAVIGATE_ATTACHED__) {
        (document as any).__NAVIGATE_ATTACHED__ = true

        const handler = (e: Event) => {
          console.log(`[navigate] resolved via ${e.type}`)
          ;(document as any).__NAVIGATE_READY__ = true
        }

        document.addEventListener('main:ready', handler, { once: true })
        document.addEventListener('view:ready', handler, { once: true })
      }

      return !!(document as any).__NAVIGATE_READY__
    }, { timeout: 300 })
  } catch {
    // Soft timeout: test continues, but hydration may be delayed
    // console.warn(`[navigate] Soft timeout waiting for hydration at ${destination}`)
  }
}

// Helper function to handle dialog interactions
/**
 *
 * @param page
 * @param type
 * @param inputText
 */
export async function handleDialog(page, type, inputText = "") {
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
 *
 * @param page
 * @param serviceName
 * @param count
 */
export async function addServicesByName(
  page: Page,
  serviceName: string,
  count: number,
) {
  for (let i = 0; i < count; i++) {
    await selectServiceByName(page, serviceName);
  }
}

/**
 *
 * @param obj
 */
export function b64(obj: any) {
  return Buffer.from(JSON.stringify(obj)).toString("base64");
}

/**
 *
 * @param page
 */
export async function clearStorage(page) {
  await navigate(page,"/");
  await page.evaluate(() => localStorage.clear());
}

/**
 *
 * @param page
 */
export async function getUnwrappedConfig(page) {
  return await page.evaluate(() => {
    const raw = localStorage.getItem("config");
    const parsed = raw ? JSON.parse(raw) : null;

    const cfg = parsed?.data || parsed;

    if (!cfg || typeof cfg !== "object") return { boards: [] };
    if (!Array.isArray(cfg.boards)) cfg.boards = [];

    return cfg;
  });
}

/**
 *
 * @param page
 */
export async function getConfigBoards(page) {
  const cfg = await getUnwrappedConfig(page);
  return Array.isArray(cfg.boards) ? cfg.boards : [];
}

/**
 *
 * @param page
 */
export async function getConfigTheme(page) {
  const cfg = await getUnwrappedConfig(page);
  return cfg?.globalSettings?.theme;
}

/**
 *
 * @param page
 */
export async function getBoardWithWidgets(page) {
  const cfg = await getUnwrappedConfig(page);
  const boards = Array.isArray(cfg.boards) ? cfg.boards : [];
  return (
    boards.find((b) => b.views?.some((v) => v.widgetState?.length > 0))?.id ||
    null
  );
}

/**
 *
 * @param page
 */
export async function getBoardCount(page) {
  const cfg = await getUnwrappedConfig(page);
  return Array.isArray(cfg.boards) ? cfg.boards.length : 0;
}

/**
 *
 * @param page
 */
export async function getShowMenuWidgetFlag(page) {
  const cfg = await getUnwrappedConfig(page);
  return !!cfg?.globalSettings?.showMenuWidget;
}

/**
 *
 * @param page
 */
export async function getLastUsedViewId(page) {
  return await page.evaluate(() => localStorage.getItem("lastUsedViewId"));
}

/**
 *
 * @param page
 */
export async function getLastUsedBoardId(page) {
  return await page.evaluate(() => localStorage.getItem("lastUsedBoardId"));
}
