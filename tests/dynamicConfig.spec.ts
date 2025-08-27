// tests/dynamicConfig.spec.ts
import { test, expect } from "./fixtures";
import { ciConfig, ciBoards } from "./data/ciConfig";
import { ciServices } from "./data/ciServices";
import {
  getUnwrappedConfig,
  getConfigBoards,
  b64,
  navigate,
} from "./shared/common";
import { ensurePanelOpen } from './shared/panels'
import { decodeConfig } from "../src/utils/compression.js";
import { restoreDeep } from "../src/utils/minimizer.js";
import { DEFAULT_CONFIG_TEMPLATE } from "../src/storage/defaultConfig.js";
import { bootWithDashboardState } from "./shared/bootState.js";
import { enableUITestMode, openConfigModalSafe } from './shared/uiHelpers';


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
    await navigate(page, "/?config_base64=%%%");
    await expect(page.locator("#config-modal")).toBeVisible();
  });

  test("shows modal if base64 decodes to invalid JSON", async ({ page }) => {
    const bad = Buffer.from("{broken}").toString("base64");
    await navigate(page, `/?config_base64=${bad}`);
    await expect(page.locator("#config-modal")).toBeVisible();
  });
});

test.describe("Dashboard Config - Remote via URL Params", () => {
  test("loads dashboard from valid config_url and services_url", async ({ page }) => {
    await page.route("**/remote-config.json", (route) =>
      route.fulfill({ json: ciConfig })
    );
    await page.route("**/remote-services.json", (route) =>
      route.fulfill({ json: ciServices })
    );

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
    await navigate(page, "/?config_url=/missing.json");
    await expect(page.locator("#config-modal")).toBeVisible();
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
    await navigate(page, "/?config_url=/bad.json");
    await expect(page.locator("#config-modal")).toBeVisible();
  });
});

test.describe("Dashboard Config - Fallback Config Popup", () => {
    test.beforeEach(async ({ page }) => {
        // FIX: Ensure a clean slate for tests that expect the modal to pop up.
        await page.addInitScript(() => {
            localStorage.clear();
            indexedDB.deleteDatabase('asd-db');
        });
    });

  test("popup appears when no config available via url, storage, or local file", async ({ page }) => {
    await navigate(page, "/");
    await expect(page.locator("#config-modal")).toBeVisible();
  });

  test("config modal shows Export button", async ({ page }) => {
    await navigate(page, "/");
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
    const url = await page.evaluate(() => (window as any).__copied);
    const hash = url.split("#")[1] || "";
    const params = new URLSearchParams(hash);
    const algo = (params.get("algo") || "gzip") as "gzip" | "deflate";
    const cc = params.get("cc")?.split(",") || [];
    const cfgChecksum = cc[0] || null;
    const svcChecksum = cc[1] || null;
    const cfgMin = await decodeConfig(params.get("cfg")!, { algo, expectChecksum: cfgChecksum });
    const svcMin = await decodeConfig(params.get("svc")!, { algo, expectChecksum: svcChecksum });
    const cfg = restoreDeep(cfgMin, DEFAULT_CONFIG_TEMPLATE);
    const svc = restoreDeep(svcMin, []);
    expect(cfg.globalSettings.theme).toBe(ciConfig.globalSettings.theme);
    expect(svc.length).toBe(ciServices.length);
  });

  test("valid input in popup initializes dashboard", async ({ page }) => {
    await navigate(page, "/");
    await expect(page.locator("#config-modal")).toBeVisible();
    await openConfigModalSafe(page);

    await page.click('button:has-text("JSON mode")');
    await page.fill("#config-json", JSON.stringify(ciConfig));
    await page.click("#config-modal .modal__btn--save");

    await page.waitForSelector('[data-testid="service-panel"]');

    const stored = await getUnwrappedConfig(page);
    expect(stored.globalSettings.theme).toBe(ciConfig.globalSettings.theme);
  });
});

test.describe("Dashboard Config - LocalStorage Behavior", () => {
    test.beforeEach(async ({ page }) => {
        // FIX: All tests need to wait for StorageManager to be ready.
        await page.addInitScript(async () => {
            const { StorageManager } = await import('/storage/StorageManager.js');
            await StorageManager.init({ persist: false, forceLocal: true });
        });
    });

  test("after first load, config is used from localStorage", async ({ page }) => {
    const config = b64(ciConfig);
    await navigate(page, `/?config_base64=${config}`);
    await page.reload();
    await expect(page.locator('[data-testid="service-panel"]')).toBeVisible();
  });

  test("changes via modal are saved and persist", async ({ page }) => {
    await navigate(page, `/?config_base64=${b64(ciConfig)}`);

    await openConfigModalSafe(page);
    await page.locator('[data-testid="advanced-mode-toggle"]').check();
    await page.locator('#config-modal').waitFor({ state: 'visible' });

    await page.click('#config-modal button:has-text("JSON mode")');
    await page.fill("#config-json", JSON.stringify({ ...ciConfig, boards: [] }));

    const svcTab = page.locator('#config-modal button[data-tab="svcTab"]');
    await svcTab.click();

    await page.click('#config-modal button:has-text("JSON mode")');
    await page.fill('#config-services', JSON.stringify([{ name: "svc1", url: "http://svc1" }]));

    const saveBtn = page.locator("#config-modal .modal__btn--save");
    await saveBtn.click();
    
    // FIX: Wait for reload to complete.
    await page.waitForLoadState('domcontentloaded');

    const stored = await getUnwrappedConfig(page);
    expect(Array.isArray(stored.boards)).toBeTruthy();

    const services = await page.evaluate(
      async () => {
        const { StorageManager } = await import("/storage/StorageManager.js");
        return StorageManager.getServices();
      }
    );
    expect(services.some((s: any) => s.name === "svc1")).toBeTruthy();
  });

  test("removing config from localStorage shows popup again", async ({ page }) => {
    await navigate(page, `/?config_base64=${b64(ciConfig)}`);
    await page.evaluate(async () => {
      const { StorageManager } = await import('/storage/StorageManager.js');
      await StorageManager.clearAll();
    });
    await page.reload();
    await expect(page.locator("#config-modal")).toBeVisible();
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