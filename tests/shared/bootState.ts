// @ts-check
import { type Page } from "@playwright/test";

/**
 * Injects dashboard state *before* the first byte of app JS executes,
 * then navigates to the provided URL so the SPA bootstraps with that
 * state.
 */
export async function bootWithDashboardState(
  page: Page,
  cfg: object,
  services: object[],
  last: { board: string; view: string },
  url = "/",
): Promise<void> {
  await page.addInitScript(
    ({ cfg, services, last }) => {
      localStorage.setItem("config", JSON.stringify({ data: cfg }));
      localStorage.setItem("services", JSON.stringify(services));
      localStorage.setItem("lastUsedBoardId", last.board);
      localStorage.setItem("lastUsedViewId", last.view);
    },
    { cfg, services, last },
  );

  // Cold-boot the real app – no race conditions afterwards.
  await page.goto(url, { waitUntil: "networkidle" });
}
