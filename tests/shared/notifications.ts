// tests/shared/notifications.ts
import type { Page } from "@playwright/test";

// Cross-version friendly typing (older PW may not export Locator type)
type LocatorLike = ReturnType<Page["locator"]>;

// The app shows transient error/info dialogs using <dialog class="user-notification ...">
const SELECTOR = 'dialog.user-notification.show, dialog.user-notification[open]';

/**
 * Returns a locator for any visible, pointer-intercepting notification dialog.
 */
export function notificationDialogs(page: Page): LocatorLike {
  return page.locator(SELECTOR);
}

/**
 * Dismiss all visible notification dialogs, if any, then wait until none remain.
 *
 * IMPORTANT: We DO NOT press Escape here because the main config modal also closes on Escape.
 * We only try clicking "close" affordances and otherwise wait for auto-hide.
 */
export async function dismissAllNotifications(page: Page, timeoutMs = 2500): Promise<void> {
  const dialogs = notificationDialogs(page);

  // If nothing is present, quick exit.
  if ((await dialogs.count()) === 0) return;

  const count = await dialogs.count();
  for (let i = 0; i < count; i++) {
    const dlg = dialogs.nth(i);

    // Try common close affordances.
    const closeBtn = dlg.locator(
      'button[aria-label="Close"], button.close, [data-action="close"], .close'
    );

    try {
      if (await closeBtn.first().isVisible().catch(() => false)) {
        await closeBtn.first().click({ force: true });
      }
    } catch {
      // Ignore sporadic focus/visibility races; we verify below.
    }
  }

  // Final guard: wait until no matching dialogs are present (auto-hide).
  await page
    .waitForFunction(
      (sel: string) => !document.querySelector(sel),
      SELECTOR,
      { timeout: timeoutMs }
    )
    .catch(() => {});
}

/**
 * Ensure there are no blocking dialogs before a pointer action.
 */
export async function ensureNoBlockingDialogs(page: Page, timeoutMs = 2500): Promise<void> {
  try {
    if ((await notificationDialogs(page).count()) > 0) {
      await dismissAllNotifications(page, timeoutMs);
    }
  } catch {
    // Best-effort: if querying count races, still attempt a dismissal.
    await dismissAllNotifications(page, timeoutMs);
  }
}
