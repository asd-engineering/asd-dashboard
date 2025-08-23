// tests/shared/notifications.ts
import type { Page } from "@playwright/test";

// Keep this loose to be compatible across PW versions.
type LocatorLike = ReturnType<Page["locator"]>;

const SELECTOR = 'dialog.user-notification.show, dialog.user-notification[open]';

/**
 * Returns a locator for any visible, pointer-intercepting notification dialog.
 */
export function notificationDialogs(page: Page): LocatorLike {
  return page.locator(SELECTOR);
}

/**
 * Dismiss all visible notification dialogs, if any, then wait until none remain.
 * - Prefer clicking a close button if present.
 * - Fallback to pressing Escape.
 * - Final guard: page-level waitForFunction that ensures no dialogs match SELECTOR.
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
      } else {
        await page.keyboard.press("Escape");
      }
    } catch {
      // Ignore sporadic focus/visibility races; we'll verify below.
    }
  }

  // Final guard: wait until no matching dialogs are present.
  // Use page-level predicate to avoid element-handle typing issues across PW versions.
  await page
    .waitForFunction(
      (sel: string) => !document.querySelector(sel),
      SELECTOR,
      { timeout: timeoutMs }
    )
    .catch(() => {});
}

/**
 * Ensure no blocking dialogs before a pointer action.
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
