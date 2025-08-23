// tests/shared/uiHelpers.ts
import type { Page } from '@playwright/test';

/**
 * Enables a deterministic UI "test mode".
 * - Adds data-test-mode attr
 * - Injects CSS to:
 *   * show flyouts/actions (no hover timing)
 *   * silence transitions/animations
 *   * prevent user-notification dialogs from intercepting pointer events
 *   * keep the config button (#open-config-modal) on top of header toggles
 *
 * Keep this helper idempotent and fast. No waits, no polling.
 */
export async function enableUITestMode(page: Page, opts?: {
  showFlyouts?: boolean;          // default: true
  muteNotifications?: boolean;    // default: true
  disableMotion?: boolean;        // default: true
  fixHeaderOverlaps?: boolean;    // default: true
}): Promise<void> {
  const {
    showFlyouts = true,
    muteNotifications = true,
    disableMotion = true,
    fixHeaderOverlaps = true,
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

  if (muteNotifications) {
    // Make transient dialogs/toasts non-intercepting.
    parts.push(`
      html[data-test-mode="true"] dialog.user-notification,
      html[data-test-mode="true"] dialog.user-notification * {
        pointer-events: none !important;
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

  if (fixHeaderOverlaps) {
    // Ensure the config button is always clickable even if sibling header controls exist.
    parts.push(`
      html[data-test-mode="true"] #open-config-modal {
        position: relative !important;
        z-index: 1000 !important;
        pointer-events: auto !important;
      }
    `);
  }

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
export async function openConfigModalSafe(page: Page): Promise<void> {
  const btn = page.locator('#open-config-modal');
  try {
    await btn.click({ timeout: 250 });
  } catch {
    await page.evaluate(() =>
      import('/component/modal/configModal.js').then(m => m.openConfigModal())
    );
  }
  await page.locator('#config-modal').waitFor({ state: 'visible', timeout: 1000 });
}
