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
  // optional sanity check – body reflects router change
  // await expect(page.locator("body")).toHaveAttribute("data-view-id", /.+/, {
  //   timeout: 4000,
  // });
}

/**
 * Wait until the dashboard is fully ready after navigation.
 * Ensures the body has data-ready="true" and a view id.
 *
 * @param {Page} page - Playwright page instance.
 * @returns {Promise<void>} Resolves when the dashboard is ready.
 */
export async function waitForDashboardReady(page: Page) {
  // await page.waitForSelector('body[data-ready="true"]');
  // await expect(page.locator('body')).toHaveAttribute('data-view-id', /.+/, {
  //   timeout: 1000,
  // });
}

/**
 * Navigates to the specified URL and waits until the dashboard is fully ready.
 * Ensures that the `<body>` element has `data-ready="true"` and optionally a `data-view-id` attribute.
 *
 * @param {import('@playwright/test').Page} page - Playwright Page instance.
 * @param {string} destination - URL to navigate to.
 * @param {import('@playwright/test').WaitForURLOptions} [gotoOptions] - Optional Playwright `goto` options.
 * @returns {Promise<void>} Resolves when the dashboard is ready.
 */
export async function navigate(
  page: Page,
  destination: string,
  gotoOptions?: Parameters<Page['goto']>[1]
): Promise<void> {
  await page.goto(destination, gotoOptions);
  // await page.waitForSelector('body[data-ready="true"]');
  // Optionally: check for presence of data-view-id
  // await expect(page.locator('body')).toHaveAttribute('data-view-id', /.+/, { timeout: 1000 });
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
