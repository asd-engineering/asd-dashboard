import { test, expect } from "./fixtures";
import { ciConfig } from "./data/ciConfig";
import { ciServices } from "./data/ciServices";
import { gzipJsonToBase64url } from "../src/utils/compression.js";
import { getUnwrappedConfig, getConfigTheme, navigate } from "./shared/common";
import { bootWithDashboardState } from "./shared/bootState.js";

async function encode(obj: any) {
  return gzipJsonToBase64url(obj);
}

test("verify config and services from URL fragment does not load before user decides", async ({
  page,
}) => {
  const cfg = await encode(ciConfig);
  const svc = await encode(ciServices);
  await navigate(page,`/#cfg=${cfg}&svc=${svc}`);
  
  const config = await getUnwrappedConfig(page);
  const services = await page.evaluate(async () => {
    const { default: sm } = await import("/storage/StorageManager.js");
    return sm.getServices();
  });

  // Storage should not have been updated yet
  expect(config.globalSettings).toBe(undefined);
  expect(services.length).toEqual(0);
});

test("fragment data is not reapplied if localStorage already has data", async ({
  page,
}) => {
  const cfg = await encode(ciConfig);
  await bootWithDashboardState(
    page,
    { globalSettings: { theme: "dark" }, boards: [] },
    [],
    { board: "", view: "" },
    `/#cfg=${cfg}`,
  );
  
  await page.waitForSelector("#fragment-decision-modal", { timeout: 5000 });
  const modal = page.locator("#fragment-decision-modal");
  await expect(modal).toBeVisible();
  await modal.locator('button:has-text("Cancel")').click();
  await expect(modal).toBeHidden();

  const theme = await getConfigTheme(page);
  expect(theme).toBe("dark");
});

test("shows merge decision modal when local data exists", async ({ page }) => {
  const cfg = await encode(ciConfig);
  const svc = await encode(ciServices);
  await bootWithDashboardState(
    page,
    {
      globalSettings: { theme: "dark" },
      boards: [{ id: "b1", name: "Board 1", order: 0, views: [] }],
    },
    [{ name: "Old", url: "http://localhost/old" }],
    { board: "", view: "" },
    `/#cfg=${cfg}&svc=${svc}`,
  );
  
  await page.waitForSelector("#fragment-decision-modal", { timeout: 5000 });
  const modal = page.locator("#fragment-decision-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("What would you like to do?");

  await modal.locator('button:has-text("Cancel")').click();
  await expect(modal).toBeHidden();

  const theme = await getConfigTheme(page);
  expect(theme).toBe("dark");
});

test("imports fragment silently when query import flag is set", async ({ page }) => {
  const cfg = await encode(ciConfig);
  const svc = await encode(ciServices);
  await bootWithDashboardState(
    page,
    { globalSettings: { theme: "dark" }, boards: [] },
    [{ name: "Old", url: "http://localhost/old" }],
    { board: "", view: "" },
    `/?import=true&import_name=CIImport#cfg=${cfg}&svc=${svc}`,
  );

  await page.waitForFunction(() => document.body.dataset.ready === "true");
  await expect(page.locator("#fragment-decision-modal")).toHaveCount(0);

  const theme = await getConfigTheme(page);
  expect(theme).toBe("light");

  const snapshots = await page.evaluate(async () => {
    const { default: sm } = await import("/storage/StorageManager.js");
    const store = await sm.loadStateStore();
    return store.states.map(s => ({ name: s.name, type: s.type }));
  });

  expect(snapshots[0].name).toBe("CIImport");
  expect(snapshots[0].type).toBe("imported");
  expect(snapshots[1].type).toBe("autosave");
});
