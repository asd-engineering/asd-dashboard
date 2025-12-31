// tests/dynamicConfig.spec.ts
import { test, expect } from "./fixtures";
import { ciConfig, ciBoards } from "./data/ciConfig";
import { ciServices } from "./data/ciServices";
import {
  getUnwrappedConfig,
  getConfigBoards,
  b64,
  navigate,
  getServices,
  clearStorage
} from "./shared/common";
import { ensurePanelOpen } from './shared/panels'
import { decodeConfig } from "../src/utils/compression.js";
import { restoreDeep } from "../src/utils/minimizer.js";
import { DEFAULT_CONFIG_TEMPLATE } from "../src/storage/defaultConfig.js";
import { bootWithDashboardState, bootWithEmptyState } from "./shared/bootState.js";
import { enableUITestMode, openConfigModalSafe, ensureNoBlockingDialogs, waitForNotificationsToClear } from './shared/uiHelpers';


test.describe("Dashboard Config - Base64 via URL Params", () => {
  test("loads dashboard from valid config_base64 and services_base64", async ({ page }) => {
    const cfg = { ...ciConfig, boards: ciBoards };
    const config = b64(cfg);
    const services = b64(ciServices);

    await navigate(page, `/?config_base64=${config}&services_base64=${services}`);

    await ensurePanelOpen(page, 'service-panel');
    await expect(page.locator('[data-testid="service-panel"] .panel-item')).toHaveCount(
      ciServices.length
    );

    const names = await page.$$eval("#board-selector option", (opts) =>
      opts.map((o) => o.textContent)
    );
    expect(names).toContain(ciBoards[0].name);

    const boards = await getConfigBoards(page);
    expect(boards.length).toBe(ciBoards.length);
  });

  test("shows config modal on invalid base64", async ({ page }) => {
    await navigate(page, "/?config_base64=%%%", { disableReadyWait: true });
    await expect(page.locator("#config-modal")).toBeVisible({ timeout: 5000 });
  });

  test("shows modal if base64 decodes to invalid JSON", async ({ page }) => {
    const bad = Buffer.from("{broken}").toString("base64");
    await navigate(page, `/?config_base64=${bad}`, { disableReadyWait: true });
    await expect(page.locator("#config-modal")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Dashboard Config - Remote via URL Params", () => {
  test("loads dashboard from valid config_url and services_url", async ({ page }) => {
    // Route the remote config/services files
    // Use function matchers to avoid matching query strings
    await page.route((url) => url.pathname === '/remote-config.json', (route) =>
      route.fulfill({ json: ciConfig })
    );
    await page.route((url) => url.pathname === '/remote-services.json', (route) =>
      route.fulfill({ json: ciServices })
    );
    // Also mock default fallbacks to avoid 404s
    await page.route((url) => url.pathname === '/config.json', (route) => route.fulfill({ status: 404 }));
    await page.route((url) => url.pathname === '/services.json', (route) => route.fulfill({ status: 404 }));

    await navigate(
      page,
      "/?config_url=/remote-config.json&services_url=/remote-services.json"
    );

    await expect(page.locator("#config-modal")).toHaveCount(0);
  });

  test("shows config popup on 404 for config_url", async ({ page }) => {
    await page.route("**/missing.json", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/missing.json")) {
        route.fulfill({ status: 404 });
      } else {
        route.continue();
      }
    });
    await navigate(page, "/?config_url=/missing.json", { disableReadyWait: true });
    await expect(page.locator("#config-modal")).toBeVisible({ timeout: 5000 });
  });

  test("shows modal on invalid JSON from remote url", async ({ page }) => {
    await page.route("**/bad.json", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/bad.json")) {
        route.fulfill({ body: "nope" });
      } else {
        route.continue();
      }
    });
    await navigate(page, "/?config_url=/bad.json", { disableReadyWait: true });
    await expect(page.locator("#config-modal")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Dashboard Config - Fallback Config Popup", () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/config.json', r => r.fulfill({ status: 404 }));
  });

  test("popup appears when no config available via url, storage, or local file", async ({ page }) => {
    await bootWithEmptyState(page, "/");
    await expect(page.locator("#config-modal")).toBeVisible();
  });

  test("config modal shows Export button", async ({ page }) => {
    await bootWithDashboardState(page, {}, [], { board: "", view: "" });
    await expect(page.locator("#config-modal .modal__btn--export")).toBeVisible();
  });

  test("export button copies encoded URL", async ({ page }) => {
    await bootWithDashboardState(page, ciConfig, ciServices, { board: "", view: "" });

    await openConfigModalSafe(page);

    await page.evaluate(() => {
      (window as any).__copied = "";
      navigator.clipboard.writeText = async (text) => {
        (window as any).__copied = text;
      };
    });

    await page.click("#config-modal .modal__btn--export");
    const url = await page.waitForFunction(() => (window as any).__copied || null).then(r => r.jsonValue());
    const hash = url.split("#")[1] || "";
    const params = new URLSearchParams(hash);
    const algo = (params.get("algo") || "gzip") as "gzip" | "deflate";
    const cc = params.get("cc")?.split(",") || [];
    const cfgChecksum = cc[0] || null;
    const svcChecksum = cc[1] || null;
    const cfgParam = params.get("cfg") || params.get("cfg0") || "";
    const svcParam = params.get("svc") || params.get("svc0") || "";
    const cfgMin = await decodeConfig(cfgParam, { algo, expectChecksum: cfgChecksum });
    const svcMin = await decodeConfig(svcParam, { algo, expectChecksum: svcChecksum });
    const cfg = restoreDeep(cfgMin, DEFAULT_CONFIG_TEMPLATE);
    const svc = restoreDeep(svcMin, []);
    expect(cfg.globalSettings.theme).toBe(ciConfig.globalSettings.theme);
    expect(svc.length).toBe(ciServices.length);
  });

  test("valid input in popup initializes dashboard", async ({ page }) => {
    await bootWithDashboardState(page, {}, [], { board: "", view: "" });
    await openConfigModalSafe(page);

    await page.locator('button[data-tab="cfgTab"]').click();

    await page.click('button:has-text("JSON mode")');
    await page.fill("#config-json", JSON.stringify(ciConfig));

    await ensureNoBlockingDialogs(page)
    await page.click("#config-modal .modal__btn--save");
    await waitForNotificationsToClear(page)
    
    await page.waitForSelector('[data-testid="service-panel"]');

    const stored = await getUnwrappedConfig(page);
    expect(stored.globalSettings.theme).toBe(ciConfig.globalSettings.theme);
  });
});

test.describe("Dashboard Config - LocalStorage Behavior", () => {
  test("after first load, config is used from localStorage", async ({ page }) => {
    const config = b64(ciConfig);
    await navigate(page, `/?config_base64=${config}`);
    await page.reload();
    await page.waitForSelector('body[data-ready="true"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="service-panel"]')).toBeVisible({ timeout: 3000 });
  });

  test("changes via modal are saved and persist", async ({ page }) => {
    await navigate(page, `/?config_base64=${b64(ciConfig)}`);

    await openConfigModalSafe(page, 'cfgTab');
    await page.locator('[data-testid="advanced-mode-toggle"]').check({ force: true });
    await page.locator('#config-modal').waitFor({ state: 'visible' });

    await page.click('button:has-text("JSON mode")');
    await page.fill("#config-json", JSON.stringify({ ...ciConfig, boards: [] }));

    const svcTab = page.locator('#config-modal button[data-tab="svcTab"]');
    await svcTab.click();

    await page.click('button:has-text("JSON mode")');
    await page.fill('#config-services', JSON.stringify([{ name: "svc1", url: "http://svc1" }]));

    const saveBtn = page.locator("#config-modal .modal__btn--save");
    await saveBtn.click();
    
    await page.waitForLoadState('domcontentloaded');

    const stored = await getUnwrappedConfig(page);
    expect(Array.isArray(stored.boards)).toBeTruthy();

    const services = await getServices(page);
    expect(services.some((s: any) => s.name === "svc1")).toBeTruthy();
  });

  test("removing config from localStorage shows popup again", async ({ page }) => {
    // Route config.json to 404 so fallback modal appears
    await page.route((url) => url.pathname === '/config.json', route => route.fulfill({ status: 404 }));
    await navigate(page, `/?config_base64=${b64(ciConfig)}`);
    // Clear storage without navigating
    await page.evaluate(async () => {
      localStorage.clear();
      await new Promise(res => {
        const req = indexedDB.deleteDatabase('asd-db');
        req.onsuccess = req.onerror = req.onblocked = () => res(null);
      });
    });
    await page.reload();
    await expect(page.locator("#config-modal")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Dashboard Functionality - Building from Services", () => {
  test("user can add board, view, and widget from services", async ({ page }) => {
    const cfg = {
      ...ciConfig,
      boards: [
        {
          id: "b1",
          name: "b1",
          order: 0,
          views: [{ id: "v1", name: "v1", widgetState: [] }],
        },
      ],
    };

    await navigate(
      page,
      `/?config_base64=${b64(cfg)}&services_base64=${b64(ciServices)}`
    );

    await ensurePanelOpen(page, 'service-panel');
    await page.locator('[data-testid="service-panel"] .panel-item').nth(1).click();

    await expect(page.locator(".widget-wrapper")).toHaveCount(1);

    const storedBoards = await getConfigBoards(page);
    expect(storedBoards.length).toBeGreaterThan(0);
  });
});

test.describe("Dashboard Config - Priority and Overwriting", () => {
  test("base64 param overrides existing localStorage config", async ({ page }) => {
    await navigate(
      page,
      `/?config_base64=${b64({ ...ciConfig, globalSettings: { theme: "dark" } })}`
    );

    await page.reload();

    await navigate(
      page,
      `/?config_base64=${b64({ ...ciConfig, globalSettings: { theme: "light" } })}`
    );

    const stored = await getUnwrappedConfig(page);
    expect(stored.globalSettings.theme).toBe("light");
  });

  test("without new param, existing config remains active", async ({ page }) => {
    await navigate(
      page,
      `/?config_base64=${b64({ ...ciConfig, globalSettings: { theme: "dark" } })}`
    );

    await page.reload();

    const stored = await getUnwrappedConfig(page);
    expect(stored.globalSettings.theme).toBe("dark");
  });
});