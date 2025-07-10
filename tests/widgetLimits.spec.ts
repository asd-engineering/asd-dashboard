import { test, expect } from "./fixtures";
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

    await page.waitForFunction(() =>
      document.querySelectorAll('.widget-wrapper').length === 1
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
    await page.goto("/");
    await page.locator(".widget-wrapper").first().waitFor();

    await page.selectOption("#service-selector", { label: "ASD-terminal" });
    await page.click("#add-widget-button");

    const modal = page.locator("#eviction-modal");
    await expect(modal).toBeVisible();
    await modal.locator('button:has-text("Remove")').click();
    await page.evaluate(() => window.asd.widgetStore.idle());
    await expect(modal).toBeHidden();
    await page.waitForFunction(() =>
      document.querySelectorAll('.widget-wrapper').length === 1
    );
    const ids = await page.$$eval('.widget-wrapper', (els) =>
      els.map((e) => e.getAttribute('data-dataid')),
    );
    expect(ids).not.toContain('W1');
  });

  test('simultaneous instance request uses single widget', async ({ page }) => {
    const boards = [
      { id: 'b1', name: 'B1', order: 0, views: [{ id: 'v1', name: 'V1', widgetState: [] }] },
      { id: 'b2', name: 'B2', order: 1, views: [{ id: 'v2', name: 'V2', widgetState: [] }] }
    ];
    const services = ciServices.map((s) =>
      s.name === 'ASD-toolbox' ? { ...s, maxInstances: 1 } : s
    );
    await routeLimits(page, boards, services, 5);
    await page.goto('/');
    await page.waitForSelector('#service-selector');

    await page.evaluate(async () => {
      const { addWidget } = await import('/component/widget/widgetManagement.js');
      const url = 'http://localhost:8000/asd/toolbox';
      await Promise.all([
        addWidget(url, 1, 1, 'web', 'b1', 'v1'),
        addWidget(url, 1, 1, 'web', 'b2', 'v2')
      ]);
    });

    await page.waitForFunction(() =>
      document.querySelectorAll('.widget-wrapper').length === 1
    );
    const selectedBoard = await page.locator('#board-selector').inputValue();
    const boardWithWidget = await page.evaluate(() => {
      const cfg = JSON.parse(localStorage.getItem('config') || '{}');
      const boards = Array.isArray(cfg.boards) ? cfg.boards : [];
      return boards.find(b => b.views.some(v => v.widgetState && v.widgetState.length > 0))?.id;
    });
    expect(selectedBoard).toBe(boardWithWidget);
  });
});
