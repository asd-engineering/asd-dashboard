// tests/shared/notifications.ts
import { Page, Locator } from "@playwright/test";

/**
 * Return a locator that matches ANY visible, pointer-intercepting notification dialog.
 * We keep this generic so UI class names can evolve without breaking tests.
 */
export function notificationDialogs(page: Page): Locator {
  return page.locator('dialog.user-notification.show, dialog.user-notification[open]');
}

/**
 * Dismiss all visible notification dialogs, if any.
 * Tries a close button if present; falls back to Escape.
 * Waits until the dialogs are gone (detached or hidden) before returning.
 */
export async function dismissAllNotifications(page: Page, timeoutMs = 2500): Promise<void> {
  const dialogs = notificationDialogs(page);
  // Quick exit if nothing is shown.
  if ((await dialogs.count()) === 0) {
    return;
  }

  const count = await dialogs.count();
  for (let i = 0; i < count; i++) {
    const dlg = dialogs.nth(i);

    // Try common close affordances.
    const closeBtn = dlg.locator(
      'button[aria-label="Close"], button.close, [data-action="close"], .close'
    );

    if (await closeBtn.first().isVisible().catch(() => false)) {
      await closeBtn.first().click({ force: true });
    } else {
      // Fallback: Escape often closes <dialog>.
      await page.keyboard.press("Escape");
    }

    // Wait for this dialog to be gone or at least not intercepting pointers.
    await Promise.race([
      dlg.waitFor({ state: "detached", timeout: timeoutMs }).catch(() => {}),
      page.waitForFunction(
        (el: HTMLDialogElement) => !el.open && !el.classList.contains("show"),
        dlg,
        { timeout: timeoutMs }
      ).catch(() => {}),
    ]);
  }

  // Final guard: ensure no notification is visible anymore.
  await page.waitForFunction(
    () => !document.querySelector('dialog.user-notification.show, dialog.user-notification[open]'),
    undefined,
    { timeout: timeoutMs }
  ).catch(() => {});
}

/**
 * Utility to ensure no blocking dialogs before attempting a pointer action.
 */
export async function ensureNoBlockingDialogs(page: Page, timeoutMs = 2500): Promise<void> {
  const dlg = notificationDialogs(page).first();
  if (await dlg.isVisible().catch(() => false)) {
    await dismissAllNotifications(page, timeoutMs);
  }
}
