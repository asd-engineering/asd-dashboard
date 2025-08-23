import { test, expect } from "./fixtures";
import { ciConfig } from "./data/ciConfig";
import { ciServices } from "./data/ciServices";
import { gzipJsonToBase64url } from "../src/utils/compression.js";
import { bootWithDashboardState } from "./shared/bootState.js";
import { navigate } from "./shared/common";

async function encode(obj) {
  return gzipJsonToBase64url(obj);
}

test.describe("Secure fragments loading configuration", () => {
  test("import modal pre-fills name and saves snapshot", async ({ page }) => {
    // SETUP: Pre-seed local config to trigger modal
    await bootWithDashboardState(
      page,
      { globalSettings: { theme: "dark" }, boards: [] },
      [],
      { board: "", view: "" },
    );

    const cfg = await encode(ciConfig);
    const svc = await encode(ciServices);
    const name = "MySnapshot";

    // Navigate with fragment (triggers modal)
    await navigate(page,`/#cfg=${cfg}&svc=${svc}&name=${encodeURIComponent(name)}`);
    
    await page.waitForSelector("#fragment-decision-modal");
    await expect(page.locator("#importName")).toHaveValue(name);

    // This click will trigger a page reload
    await page.locator('#switch-environment').click() 
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('[data-testid="board-panel"]');

    // Now re-import StorageManager in a fresh JS context
    // TODO: refactor snapshot lookup into a shared helper
    const result = await page.evaluate(async () => {
      const sm = (await import("/storage/StorageManager.js")).default;
      const snapshot = (await sm.loadStateStore()).states.find(
        (s) => s.name === "MySnapshot",
      );
      return snapshot;
    });

    expect(result?.name).toBe(name);
    expect(result?.type).toBe("imported");
  });
});
