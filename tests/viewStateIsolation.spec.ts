// @ts-check
import { test, expect } from "./fixtures";
import { routeServicesConfig } from "./shared/mocking.js";
import { bootWithDashboardState } from "./shared/bootState.js";

// Define a deterministic initial state with a clean board and two empty views.
const initialBoards = [
  {
    id: "board-iso-test-1",
    name: "State Isolation Test Board",
    order: 0,
    views: [
      {
        id: "view-A",
        name: "View A",
        widgetState: [
          {
            order: "0",
            url: "http://localhost:8000/asd/toolbox",
            columns: "1",
            rows: "1",
            type: "web",
            dataid: "W-toolbox",
            metadata: { title: "toolbox" },
          },
        ],
      },
      {
        id: "view-B",
        name: "View B",
        widgetState: [
          {
            order: "0",
            url: "http://localhost:8000/asd/terminal",
            columns: "1",
            rows: "1",
            type: "web",
            dataid: "W-terminal",
            metadata: { title: "terminal" },
          },
        ],
      },
    ],
  },
];

test.describe("Widget State Isolation Between Views", () => {
  // Before each test, set up the clean environment with our predefined board structure.
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page);
    await bootWithDashboardState(
      page,
      { boards: initialBoards },
      [
        { name: "ASD-toolbox", url: "http://localhost:8000/asd/toolbox" },
        { name: "ASD-terminal", url: "http://localhost:8000/asd/terminal" },
      ],
      { board: "board-iso-test-1", view: "view-A" },
    );
    
  });

  test("widgets added to one view should not appear in another view after switching", async ({
    page,
  }) => {
    const widgetToolbox = page.locator(
      '.widget-wrapper[data-service="ASD-toolbox"]',
    );
    const widgetTerminal = page.locator(
      '.widget-wrapper[data-service="ASD-terminal"]',
    );

    // --- STEP 1: Verify View A shows only the Toolbox widget ---
    await expect(widgetToolbox).toBeVisible({ timeout: 5000 });
    await expect(widgetTerminal).toBeHidden();
    await expect(page.locator('.widget-wrapper:visible')).toHaveCount(1);

    // --- STEP 2: Switch to View B ---
    await page.evaluate(() => {
      const sel = document.querySelector('#view-selector') as HTMLSelectElement | null;
      if (sel) {
        const opt = Array.from(sel.options).find((o) => o.textContent === 'View B');
        if (opt) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForSelector('.board-view#view-B');

    // VERIFY (View B): Terminal widget is visible, Toolbox is hidden.
    await expect(widgetTerminal).toBeVisible({ timeout: 5000 });
    await expect(widgetToolbox).toBeHidden();
    await expect(page.locator('.widget-wrapper:visible')).toHaveCount(1);

    // --- STEP 3: Switch back to View A ---
    await page.evaluate(() => {
      const sel = document.querySelector('#view-selector') as HTMLSelectElement | null;
      if (sel) {
        const opt = Array.from(sel.options).find(o => o.textContent === 'View A');
        if (opt) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForSelector('.board-view#view-A');

    // Verify View A still shows only the Toolbox widget.
    await expect(widgetToolbox).toBeVisible({ timeout: 5000 });
    await expect(widgetTerminal).toBeHidden();
    await expect(page.locator('.widget-wrapper:visible')).toHaveCount(1);

    // --- FINAL CHECK: Switch back to View B one last time ---
    await page.evaluate(() => {
      const sel = document.querySelector('#view-selector') as HTMLSelectElement | null;
      if (sel) {
        const opt = Array.from(sel.options).find(o => o.textContent === 'View B');
        if (opt) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
    await page.waitForSelector('.board-view#view-B');

    // Verify View B shows only the Terminal widget again.
    await expect(widgetTerminal).toBeVisible({ timeout: 5000 });
    await expect(widgetToolbox).toBeHidden();
    await expect(page.locator('.widget-wrapper:visible')).toHaveCount(1);
  });
});
