// @ts-check
import { test, expect } from "./fixtures";
import { routeServicesConfig } from "./shared/mocking.js";
import { selectServiceByName, selectViewByLabel } from "./shared/common.js";
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
        widgetState: [],
      },
      {
        id: "view-B",
        name: "View B",
        widgetState: [],
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
    await page.waitForFunction(() => document.body.dataset.ready === "true");
  });

  test("widgets added to one view should not appear in another view after switching", async ({
    page,
  }) => {
    // Define locators for the widgets we'll be adding.
    const widgetToolbox = page.locator(
      '.widget-wrapper[data-service="ASD-toolbox"]',
    );

    // --- STEP 1: Add a widget to View A ---
    await selectViewByLabel(page, "View A");
    await selectServiceByName(page, "ASD-toolbox");

    // VERIFY (View A): Toolbox widget is visible, and it's the only one.
    await expect(widgetToolbox).toBeVisible();
    await expect(page.locator(".widget-wrapper:visible")).toHaveCount(1);

    // --- STEP 2: Switch to View B ---
    await selectViewByLabel(page, "View B");

    // VERIFY (View B): The container is now empty. The Toolbox widget should be hidden.
    await expect(widgetToolbox).toBeHidden();
    await expect(page.locator(".widget-wrapper:visible")).toHaveCount(0);

    // --- STEP 3: Switch back to View A ---
    await selectViewByLabel(page, "View A");

    // CRITICAL VERIFICATION:
    // Ensure View A shows ONLY the Toolbox widget.
    await expect(widgetToolbox).toBeVisible();
    await expect(page.locator(".widget-wrapper:visible")).toHaveCount(1);
  });
});
