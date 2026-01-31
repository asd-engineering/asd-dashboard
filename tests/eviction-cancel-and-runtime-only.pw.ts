import { test, expect } from './fixtures';
import { ciConfig } from './data/ciConfig';
import { ciServices } from './data/ciServices';

async function routeLimits(page, boards, services, maxSize = 2, configOverrides = {}) {
  await page.route('**/services.json', (route) => route.fulfill({ json: services }));
  await page.route('**/config.json', (route) =>
    route.fulfill({ json: { ...ciConfig, ...configOverrides, boards } }),
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

test.describe('Eviction cancel & runtime-only behavior', () => {
  // These tests use page.evaluate with async modal interactions - need extra time under load
  test.setTimeout(30000);

  test('Cancel: stays on current view and storage is unchanged', async ({ page }) => {
    const boards = [
      {
        id: 'b',
        name: 'B',
        order: 0,
        views: [
          {
            id: 'v1',
            name: 'V1',
            widgetState: [
              { order: '0', url: 'http://localhost:8000/asd/toolbox',   type: 'web', dataid: 'W1', serviceId: 'toolbox' },
              { order: '1', url: 'http://localhost:8000/asd/terminal',  type: 'web', dataid: 'W2', serviceId: 'terminal' },
              { order: '2', url: 'http://localhost:8000/asd/tunnel',    type: 'web', dataid: 'W3', serviceId: 'tunnel' }
            ]
          },
          {
            id: 'v2',
            name: 'V2',
            widgetState: [
              { order: '0', url: 'http://localhost:8000/asd/toolbox',   type: 'web', dataid: 'W1', serviceId: 'toolbox' },
              { order: '1', url: 'http://localhost:8000/asd/terminal',  type: 'web', dataid: 'W2', serviceId: 'terminal' },
              { order: '2', url: 'http://localhost:8000/asd/containers',type: 'web', dataid: 'W4', serviceId: 'containers' }
            ]
          }
        ]
      }
    ];

    // Boot with small capacity so switching to v2 would require eviction
    await routeLimits(page, boards, ciServices, 3, {
      globalSettings: {
        ...ciConfig.globalSettings,
        localStorage: {
          ...ciConfig.globalSettings.localStorage,
          defaultBoard: 'b',
          defaultView: 'v1',
          loadDashboardFromConfig: 'true'
        }
      }
    });

    await page.goto('/');
    await page.locator('.widget-wrapper').nth(2).waitFor();

    // Snapshot storage before
    const before = await page.evaluate(async () => {
      const { StorageManager } = await import('/storage/StorageManager.js');
      return StorageManager.getBoards();
    });

    // Attempt to switch; cancel eviction
    // Start the switchView in background, then wait for modal and click cancel
    const switchPromise = page.evaluate(async () => {
      const { switchView } = await import('/component/board/boardManagement.js');
      return switchView('b', 'v2');
    });
    // Wait for modal cancel button and click it
    const cancelBtn = page.locator('#eviction-modal .modal__btn--cancel');
    await cancelBtn.waitFor({ timeout: 5000 });
    await cancelBtn.click();
    await switchPromise;

    // We should remain on v1 DOM-wise (all original W1..W3 still present)
    const currentIds = await page.$$eval('.widget-wrapper', els => els.map(e => e.getAttribute('data-dataid')).filter(Boolean));
    expect(currentIds.sort()).toEqual(['W1', 'W2', 'W3'].sort());

    // Storage must be unchanged
    const after = await page.evaluate(async () => {
      const { StorageManager } = await import('/storage/StorageManager.js');
      return StorageManager.getBoards();
    });
    expect(after).toEqual(before);
  });

  test('Runtime-only eviction: view storage (widgetState) is not mutated', async ({ page }) => {
    const boards = [
      {
        id: 'b',
        name: 'B',
        order: 0,
        views: [
          {
            id: 'v1',
            name: 'V1',
            widgetState: [
              { order: '0', url: 'http://localhost:8000/asd/toolbox',   type: 'web', dataid: 'W1', serviceId: 'toolbox' },
              { order: '1', url: 'http://localhost:8000/asd/terminal',  type: 'web', dataid: 'W2', serviceId: 'terminal' },
              { order: '2', url: 'http://localhost:8000/asd/tunnel',    type: 'web', dataid: 'W3', serviceId: 'tunnel' }
            ]
          },
          {
            id: 'v2',
            name: 'V2',
            widgetState: [
              { order: '0', url: 'http://localhost:8000/asd/toolbox',   type: 'web', dataid: 'W1', serviceId: 'toolbox' },
              { order: '1', url: 'http://localhost:8000/asd/terminal',  type: 'web', dataid: 'W2', serviceId: 'terminal' },
              { order: '2', url: 'http://localhost:8000/asd/containers',type: 'web', dataid: 'W4', serviceId: 'containers' }
            ]
          }
        ]
      }
    ];

    await routeLimits(page, boards, ciServices, 3, {
      globalSettings: {
        ...ciConfig.globalSettings,
        localStorage: {
          ...ciConfig.globalSettings.localStorage,
          defaultBoard: 'b',
          defaultView: 'v1',
          loadDashboardFromConfig: 'true'
        }
      }
    });

    await page.goto('/');
    await page.locator('.widget-wrapper').nth(2).waitFor();

    // Switch to v2; confirm eviction (auto LRU)
    // Start the switchView in background, then wait for modal and click auto-remove
    const switchPromise = page.evaluate(async () => {
      const { switchView } = await import('/component/board/boardManagement.js');
      return switchView('b', 'v2');
    });
    // Wait for auto-remove button and click it
    const autoBtn = page.locator('#eviction-modal #evict-lru-btn');
    await autoBtn.waitFor({ timeout: 5000 });
    await autoBtn.click();
    await switchPromise;

    // New DOM should reflect v2 widgets
    const currentIds = await page.$$eval('.widget-wrapper', els => els.map(e => e.getAttribute('data-dataid')).filter(Boolean));
    expect(currentIds.sort()).toEqual(['W1', 'W2', 'W4'].sort());

    // BUT storage definitions for both views must remain as originally configured
    const stored = await page.evaluate(async () => {
      const { StorageManager } = await import('/storage/StorageManager.js');
      return StorageManager.getBoards();
    });
    expect(stored[0].views.find(v => v.id === 'v1')!.widgetState.map(w => w.dataid).sort()).toEqual(['W1','W2','W3'].sort());
    expect(stored[0].views.find(v => v.id === 'v2')!.widgetState.map(w => w.dataid).sort()).toEqual(['W1','W2','W4'].sort());
  });
});

