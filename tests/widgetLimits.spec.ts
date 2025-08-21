// tests/widgetLimits.spec.ts
import { test, expect } from "./fixtures";
import { ciConfig } from "./data/ciConfig";
import { ciServices } from "./data/ciServices";
import { getUnwrappedConfig, navigate } from "./shared/common";
import { waitForWidgetStoreIdle } from "./shared/state.js";
import { ensurePanelOpen } from "./shared/common";

async function routeLimits(page, boards, services, maxSize = 2, configOverrides = {}) {
  await page.route("**/services.json", (route) =>
    route.fulfill({ json: services }),
  );
  await page.route("**/config.json", (route) =>
    route.fulfill({ json: { ...ciConfig, ...configOverrides, boards } }),
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
  test("per service maxInstances navigates to existing widget", async ({ page }) => {
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
    await navigate(page, "/");

    await page.locator(".widget-wrapper").first().waitFor();
    await ensurePanelOpen(page);

    await page.locator('[data-testid="board-panel"]').hover();
    await page.locator('[data-testid="board-panel"] .panel-item', { hasText: 'B2' }).click();
    await page.click('[data-testid="service-panel"] .panel-item:has-text("ASD-toolbox")');

    await page.waitForFunction(
      () => document.querySelectorAll(".widget-wrapper").length === 1
    );
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
    await navigate(page, "/");

    await page.locator(".widget-wrapper").first().waitFor();
    await ensurePanelOpen(page);

    await page.click('[data-testid="service-panel"] .panel-item:has-text("ASD-terminal")');

    const modal = page.locator("#eviction-modal");
    await expect(modal).toBeVisible();
    await modal.locator('button:has-text("Remove")').click();
    await waitForWidgetStoreIdle(page);
    await expect(modal).toBeHidden();
    await page.waitForFunction(
      () => document.querySelectorAll(".widget-wrapper").length === 1
    );
    const ids = await page.$$eval(".widget-wrapper", (els) =>
      els.map((e) => e.getAttribute("data-dataid")),
    );
    expect(ids).not.toContain("W1");
  });

  test("simultaneous instance request uses single widget", async ({ page }) => {
    const boards = [
      { id: "b1", name: "B1", order: 0, views: [{ id: "v1", name: "V1", widgetState: [] }] },
      { id: "b2", name: "B2", order: 1, views: [{ id: "v2", name: "V2", widgetState: [] }] },
    ];
    const services = ciServices.map((s) =>
      s.name === "ASD-toolbox" ? { ...s, maxInstances: 1 } : s
    );

    await routeLimits(page, boards, services, 5);
    await navigate(page, "/");
    await page.waitForSelector('[data-testid="service-panel"]');
    await ensurePanelOpen(page);

    await page.evaluate(async () => {
      const { addWidget } = await import("/component/widget/widgetManagement.js");
      const url = "http://localhost:8000/asd/toolbox";
      await Promise.all([
        addWidget(url, 1, 1, "web", "b1", "v1"),
        addWidget(url, 1, 1, "web", "b2", "v2"),
      ]);
    });

    await page.waitForFunction(
      () => document.querySelectorAll(".widget-wrapper").length === 1
    );
    const selectedBoard = await page.locator("#board-selector").inputValue();
    const cfg = await getUnwrappedConfig(page);
    const boardWithWidget = cfg.boards.find((b) =>
      b.views.some((v) => v.widgetState?.length > 0)
    )?.id;
    expect(selectedBoard).toBe(boardWithWidget);
  });

  test("services with identical URLs maintain separate maxInstances", async ({ page }) => {
    const services = [
      { id: "svc1", name: "SvcA", url: "http://localhost:8000/asd/toolbox", maxInstances: 1 },
      { id: "svc2", name: "SvcB", url: "http://localhost:8000/asd/toolbox", maxInstances: 1 },
    ];
    const boards = [
      {
        id: "b",
        name: "B",
        order: 0,
        views: [
          {
            id: "v",
            name: "V",
            widgetState: [
              {
                order: "0",
                url: "http://localhost:8000/asd/toolbox",
                type: "web",
                dataid: "W1",
                serviceId: "svc1",
                columns: "1",
                rows: "1",
              },
            ],
          },
        ],
      },
    ];

    await routeLimits(page, boards, services, 5);
    await navigate(page, "/");
    await ensurePanelOpen(page);

    await page.evaluate(() => document.dispatchEvent(new CustomEvent('state-change', { detail: { reason: 'services' } })));

    const countA = await page
      .locator('[data-testid="service-panel"] .panel-item', { hasText: 'SvcA' })
      .locator('.panel-item-meta')
      .innerText();
    const countB = await page
      .locator('[data-testid="service-panel"] .panel-item', { hasText: 'SvcB' })
      .locator('.panel-item-meta')
      .innerText();
    expect(countA).toBe(" (1/1)");
    expect(countB).toBe(" (0/1)");

    await page.evaluate(async () => {
      const StorageManager = (await import('/storage/StorageManager.js')).default;
      StorageManager.updateBoards((boards) => {
        const board = boards.find((b) => b.id === 'b');
        const view = board?.views.find((v) => v.id === 'v');
        view?.widgetState.push({
          order: '1',
          url: 'http://localhost:8000/asd/toolbox',
          type: 'web',
          dataid: 'W2',
          serviceId: 'svc2',
          columns: '1',
          rows: '1'
        });
      });
      document.dispatchEvent(new CustomEvent('state-change', { detail: { reason: 'services' } }));
    });

    const updatedA = await page
      .locator('[data-testid="service-panel"] .panel-item', { hasText: 'SvcA' })
      .locator('.panel-item-meta')
      .innerText();
    const updatedB = await page
      .locator('[data-testid="service-panel"] .panel-item', { hasText: 'SvcB' })
      .locator('.panel-item-meta')
      .innerText();
    expect(updatedA).toBe(" (1/1)");
    expect(updatedB).toBe(" (1/1)");
  });

});
