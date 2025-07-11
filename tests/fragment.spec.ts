import { test, expect } from "./fixtures";
import { ciConfig } from "./data/ciConfig";
import { ciServices } from "./data/ciServices";
import { gzipJsonToBase64url } from "../src/utils/compression.js";
import { bootWithDashboardState } from "./shared/bootState.js";
import { waitForDashboardReady } from "./shared/common";

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
    await page.goto(`/#cfg=${cfg}&svc=${svc}&name=${encodeURIComponent(name)}`);
    // await waitForDashboardReady(page)
    await page.waitForSelector("#fragment-decision-modal");
    await expect(page.locator("#importName")).toHaveValue(name);

    // Trigger overwrite (this reloads the page)
    await page
      .locator('#fragment-decision-modal button:has-text("Overwrite")')
      .click();

    // Wait for reload and presence of final ready state
    // await waitForDashboardReady(page)

    // Now re-import StorageManager in a fresh JS context
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
