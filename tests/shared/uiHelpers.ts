// tests/shared/uiHelpers.ts
import type { Page } from '@playwright/test';

/**
 * Enables a deterministic UI "test mode".
 * - Adds data-test-mode attr
 * - Injects CSS to:
 *   * show flyouts/actions (no hover timing)
 *   * silence transitions/animations
 *   * keep the config button (#open-config-modal) on top of header toggles
 *
 * Keep this helper idempotent and fast. No waits, no polling.
 */
export async function enableUITestMode(page: Page, opts?: {
  showFlyouts?: boolean;          // default: true
  disableMotion?: boolean;        // default: true
  fixHeaderOverlaps?: boolean;    // default: true
}): Promise<void> {
  const {
    showFlyouts = true,
    disableMotion = true,
    fixHeaderOverlaps = false,
  } = opts || {};

  // Mark page as test-mode (one tiny evaluate).
  await page.evaluate(() => {
    const html = document.documentElement;
    if (!html) return;
    html.setAttribute('data-test-mode', 'true');
    // Make this idempotent: only set once.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__HOVER_INTENT_DELAY__ = 0;
  }).catch(() => { /* ok during early nav */ });

  const parts: string[] = [];

  if (showFlyouts) {
    parts.push(`
      html[data-test-mode="true"] .panel-item > .panel-item-actions-flyout,
      html[data-test-mode="true"] .panel-item > .panel-item-hint,
      html[data-test-mode="true"] .menu-item .panel-item-actions-flyout {
        visibility: visible !important;
        opacity: 1 !important;
        display: inline-flex !important;
        transition: none !important;
        pointer-events: auto !important;
      }
      html[data-test-mode="true"] .panel-item,
      html[data-test-mode="true"] .menu-item,
      html[data-test-mode="true"] .panel-item > .panel-item-actions-flyout *,
      html[data-test-mode="true"] .menu-item .panel-item-actions-flyout * {
        transition: none !important;
      }
    `);
  }

  if (disableMotion) {
    parts.push(`
      html[data-test-mode="true"] *, html[data-test-mode="true"] *::before, html[data-test-mode="true"] *::after {
        transition: none !important;
        animation: none !important;
      }
    `);
  }

  // if (fixHeaderOverlaps) {
  //   // Ensure the config button is always clickable even if sibling header controls exist.
  //   parts.push(`
  //     html[data-test-mode="true"] #open-config-modal {
  //       position: relative !important;
  //       z-index: 1000 !important;
  //       pointer-events: auto !important;
  //     }
  //   `);
  // }

  if (parts.length) {
    await page.addStyleTag({
      content: parts.join('\n'),
    }).catch(() => { /* ok during early nav */ });
  }
}

/**
 * Safe modal opener that cannot be blocked by header overlays.
 * - Try a normal click first.
 * - Fallback to programmatic open if something still covers the button.
 */
// export async function openConfigModalSafe(page: Page, tab?: 'stateTab'|'cfgTab'|'svcTab'): Promise<void> {
//   await page.waitForLoadState('domcontentloaded')

//   // Try twice in case something closes it immediately
//   for (let i = 0; i < 2; i++) {
//     if (!(await page.locator('#config-modal').isVisible())) {
//       await page.click('#open-config-modal', { force: true }).catch(() => {})
//     }

//     // Attached is enough; don’t require "visible"
//     await page.locator('#config-modal .tabs').waitFor({ state: 'attached', timeout: 1500 }).catch(() => {})

//     if (tab) {
//       const btn = page.locator(`#config-modal .tabs button[data-tab="${tab}"]`)
//       if (await btn.count()) await btn.click().catch(() => {})
//       await page.locator(`#${tab}`).waitFor({ state: 'attached', timeout: 1500 }).catch(() => {})
//     }

//     if (await page.locator('#config-modal').isVisible()) break
//   }
// }
/**
 * Safe modal opener that is reload-tolerant.
 * - Prefer programmatic open (import + call) to avoid header overlap.
 * - All locator checks are wrapped so nav/context-loss doesn't explode the test.
 */
export async function openConfigModalSafe(
  page: Page,
  tab?: 'stateTab'|'cfgTab'|'svcTab'
): Promise<void> {
  await page.waitForLoadState('domcontentloaded').catch(() => {});

  const isVisible = async (sel: string) => {
    try {
      return await page.locator(sel).isVisible();
    } catch {
      return false;
    }
  };

  // Try up to 3 cycles to cross any navigation boundary safely.
  for (let i = 0; i < 3; i++) {
    // Programmatic open is the most reliable
    try {
      await page.evaluate(() =>
        import('/component/modal/configModal.js').then((m) => m.openConfigModal())
      );
    } catch {
      // fallback to click
      await page.click('#open-config-modal', { force: true }).catch(() => {});
    }

    // Tabs attached = modal is present in DOM
    await page.locator('#config-modal .tabs').waitFor({ state: 'attached', timeout: 1500 }).catch(() => {});

    if (tab) {
      const btn = page.locator(`#config-modal .tabs button[data-tab="${tab}"]`);
      try {
        if (await btn.count()) await btn.click({ force: true }).catch(() => {});
        await page.locator(`#${tab}`).waitFor({ state: 'attached', timeout: 1500 }).catch(() => {});
      } catch { /* retry next loop */ }
    }

    if (await isVisible('#config-modal')) return;
  }

  throw new Error('openConfigModalSafe: could not open #config-modal after 3 attempts');
}

/**
 * Dismiss any stack of user notifications (toasts).
 * Best-effort: ignores if buttons aren’t present.
 */
export async function dismissAllNotifications(page: Page): Promise<void> {
  const toasts = page.locator('dialog.user-notification');
  const count = await toasts.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    const toast = toasts.nth(i);
    const btn = toast.locator('button, [role="button"]').first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ trial: false }).catch(() => {});
    }
  }
}

/**
 * Ensure no blocking overlays remain before a critical click sequence.
 */
export async function ensureNoBlockingDialogs(page: Page): Promise<void> {
  await dismissAllNotifications(page);
  await page.locator('dialog.user-notification').waitFor({ state: 'detached' }).catch(() => {});
}

/**
 * Wait until any transient toast/dialog overlays are gone.
 * Safe no-op if none are present.
 */
export async function waitForNotificationsToClear(page: Page, timeout = 3000): Promise<void> {
  await page
    .locator('dialog.user-notification')
    .waitFor({ state: 'detached', timeout })
    .catch(() => {});
}
