// tests/shared/uiHelpers.ts
import type { Page } from '@playwright/test';

/**
 * Enables test-mode UI overrides without addInitScript.
 * - Sets a root attribute for targeted CSS
 * - Injects a <style> that forces hover/flyouts visible and removes transitions
 * - Sets an optional zero-delay flag for debounce logic
 */
export async function enableHoverTestMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    try {
      const html = document.documentElement;
      if (!html) return;

      html.setAttribute('data-test-mode', 'true');

      // Idempotent: reuse existing style if present
      const id = 'asd-test-hover-intent-overrides';
      let style = document.getElementById(id) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement('style');
        style.id = id;
        style.textContent = `
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
        `;
        document.head.appendChild(style);
      }

      // Optional: let code paths skip delays/debounce in tests
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-underscore-dangle
      (globalThis as any).__HOVER_INTENT_DELAY__ = 0;
    } catch {
      /* ignore */
    }
  });
}
