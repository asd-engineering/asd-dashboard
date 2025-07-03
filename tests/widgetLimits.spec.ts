import { test, expect } from "@playwright/test";
import { ciConfig } from "./data/ciConfig";
import { ciServices } from "./data/ciServices";

async function routeLimits(page, boards, services, maxSize = 2) {
  await page.route("**/services.json", (route) =>
    route.fulfill({ json: services }),
  );
  await page.route("**/config.json", (route) =>
    route.fulfill({ json: { ...ciConfig, boards } }),
  );
  await page.addInitScript((size) => {
    const apply = () => {
      if (window.asd?.widgetStore) {
        window.asd.widgetStore.maxSize = size;
      } else {
        setTimeout(apply, 0);
      }
    };
    apply();
  }, maxSize);
}

test.describe("Widget limits", () => {
  test("per service maxInstances navigates to existing widget", async ({
    page,
  }) => {
    const boards = [
      {
        id: "b1",
        name: "B1",
        order: 0,
        views: [
          {
            id: "v1",
            name: "V1",
            widgetState: [
              {
                order: "0",
                url: "http://localhost:8000/asd/toolbox",
                type: "web",
                dataid: "W1",
              },
            ],
          },
        ],
      },
      {
        id: "b2",
        name: "B2",
        order: 1,
        views: [{ id: "v2", name: "V2", widgetState: [] }],
      },
    ];
    const services = ciServices.map((s) =>
      s.name === "ASD-toolbox" ? { ...s, maxInstances: 1 } : s,
    );
    await routeLimits(page, boards, services, 5);
    await page.goto("/");
    await page.locator(".widget-wrapper").first().waitFor();

    await page.locator("#board-selector").selectOption("b2");
    await page.selectOption("#service-selector", { label: "ASD-toolbox" });
    await page.click("#add-widget-button");

    await expect(page.locator(".widget-wrapper")).toHaveCount(1);
  });

  test("evicts selected widget when store is full", async ({ page }) => {
    const widgetState = [
      {
        order: "0",
        url: "http://localhost:8000/asd/toolbox",
        type: "web",
        dataid: "W1",
        metadata: { title: "w1" },
      },
    ];
    const boards = [
      {
        id: "b",
        name: "B",
        order: 0,
        views: [{ id: "v", name: "V", widgetState }],
      },
    ];
    await routeLimits(page, boards, ciServices, 1);
    await page.goto("/");
    await page.locator(".widget-wrapper").first().waitFor();

    await page.selectOption("#service-selector", { label: "ASD-terminal" });
    await page.click("#add-widget-button");

    const modal = page.locator("#eviction-modal");
    await expect(modal).toBeVisible();
    await modal.locator('button:has-text("Remove")').click();
    await expect(modal).toBeHidden();
    await page.waitForSelector(".widget-wrapper");
    const ids = await page.$$eval(".widget-wrapper", (els) =>
      els.map((e) => e.getAttribute("data-dataid")),
    );
    expect(ids).toHaveLength(1);
    expect(ids[0]).not.toBe("W1");
  });
});
