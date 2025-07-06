import { test, expect } from './fixtures';
import { ensurePanelOpen } from './shared/common';
import { ciConfig, ciBoards } from './data/ciConfig';
import { ciServices } from './data/ciServices';
import { gunzipSync } from 'zlib';

function b64(obj: any) {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

async function clearStorage(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
}

test.beforeEach(async ({ page }) => {
  // Go to the page
  await page.goto('/');
  
  // Wait for the application's async initialization in main.js to complete.
  await page.waitForSelector('body[data-ready="true"]', { timeout: 10000 });
});

// Base64 params

test.describe('Dashboard Config - Base64 via URL Params', () => {
  test('loads dashboard from valid config_base64 and services_base64', async ({ page }) => {
    const cfg = { ...ciConfig, boards: ciBoards };
    const config = b64(cfg);
    const services = b64(ciServices);
    await page.goto(`/?config_base64=${config}&services_base64=${services}`);
    await expect(page.locator('#widget-selector-panel .widget-option')).toHaveCount(ciServices.length + 1);
    const boards = await page.evaluate(() => window.asd.boards);
    expect(boards.length).toBe(ciBoards.length);
    const names = await page.$$eval('#board-selector option', opts => opts.map(o => o.textContent));
    expect(names).toContain(ciBoards[0].name);
  });

  test('shows config modal on invalid base64', async ({ page }) => {
    await page.goto('/?config_base64=%%%');
    await expect(page.locator('#localStorage-modal')).toBeVisible();
  });

  test('shows modal if base64 decodes to invalid JSON', async ({ page }) => {
    const bad = Buffer.from('{broken}').toString('base64');
    await page.goto(`/?config_base64=${bad}`);
    await expect(page.locator('#localStorage-modal')).toBeVisible();
  });
});

// Remote params

test.describe('Dashboard Config - Remote via URL Params', () => {
  test('loads dashboard from valid config_url and services_url', async ({ page }) => {
    await page.route('**/remote-config.json', route => route.fulfill({ json: ciConfig }));
    await page.route('**/remote-services.json', route => route.fulfill({ json: ciServices }));
    await page.goto('/?config_url=/remote-config.json&services_url=/remote-services.json');
    await expect(page.locator('#config-modal')).toHaveCount(0);
  });

  test('shows config popup on 404 for config_url', async ({ page }) => {
    await page.route('**/missing.json', route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/missing.json')) {
        route.fulfill({ status: 404 });
      } else {
        route.continue();
      }
    });
    await page.goto('/?config_url=/missing.json');
    await expect(page.locator('#config-modal')).toBeVisible();
  });

  test('shows modal on invalid JSON from remote url', async ({ page }) => {
    await page.route('**/bad.json', route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/bad.json')) {
        route.fulfill({ body: 'nope' });
      } else {
        route.continue();
      }
    });
    await page.goto('/?config_url=/bad.json');
    await expect(page.locator('#config-modal')).toBeVisible();
  });
});

// Fallback modal

test.describe('Dashboard Config - Fallback Config Popup', () => {
  test.beforeEach(async ({ page }) => { await clearStorage(page); });

  test('popup appears when no config available via url, storage, or local file', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#config-modal')).toBeVisible();
  });

  test('config modal shows Export button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#config-modal .modal__btn--export')).toBeVisible();
  });

  test('export button copies encoded URL', async ({ page }) => {
    await page.evaluate(({ cfg, svc }) => {
      localStorage.setItem('config', JSON.stringify(cfg));
      localStorage.setItem('services', JSON.stringify(svc));
    }, { cfg: ciConfig, svc: ciServices });
    await page.evaluate(() => import('/component/modal/configModal.js').then(m => m.openConfigModal()));
    await page.waitForSelector('#config-modal .modal__btn--export');
    await page.evaluate(() => { (window as any).__copied = ''; navigator.clipboard.writeText = async text => { (window as any).__copied = text }; });
    await page.click('#config-modal .modal__btn--export');
    const url = await page.evaluate(() => (window as any).__copied);
    const hash = url.split('#')[1] || '';
    const params = new URLSearchParams(hash);

    const decode = (str: string) => {
      const pad = '='.repeat((4 - str.length % 4) % 4);
      const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
      const buf = Buffer.from(b64, 'base64');
      return gunzipSync(buf).toString();
    };

    const cfg = JSON.parse(decode(params.get('cfg')!));
    const svc = JSON.parse(decode(params.get('svc')!));
    expect(cfg.globalSettings.theme).toBe(ciConfig.globalSettings.theme);
    expect(svc.length).toBe(ciServices.length);
  });

  test('valid input in popup initializes dashboard', async ({ page }) => {
    await page.goto('/');
    await page.click('#config-modal .modal__btn--cancel');
    await page.evaluate(() => {
      return import('/component/modal/configModal.js').then(m => m.openConfigModal());
    });
    await page.waitForSelector('#config-json');
    await page.fill('#config-json', JSON.stringify(ciConfig));
    await page.click('#config-modal .modal__btn--save');
    await page.waitForSelector('#widget-selector-panel');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('config') || '{}'));
    expect(stored.globalSettings.theme).toBe(ciConfig.globalSettings.theme);
  });

  test('invalid JSON in popup shows error', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => import('/component/modal/configModal.js').then(m => m.openConfigModal()));
    await page.waitForSelector('#config-json');
    await page.fill('#config-json', '{broken');
    await page.click('#config-modal button.modal__btn--save');
    const notif = page.locator('.user-notification.error span').last()
    await expect(notif).toHaveText(/Invalid JSON/);
    await expect(page.locator('#config-modal')).toBeVisible();
  });
});

// LocalStorage behavior

test.describe('Dashboard Config - LocalStorage Behavior', () => {
  test('after first load, config is used from localStorage', async ({ page }) => {
    const config = b64(ciConfig);
    await page.goto(`/?config_base64=${config}`);
    await page.reload();
    await expect(page.locator('#widget-selector-panel')).toBeVisible();
  });

  test('changes via modal are saved and persist', async ({ page }) => {
    await page.goto(`/?config_base64=${b64(ciConfig)}`);
    await page.click('#open-config-modal');
    await page.fill('#config-json', JSON.stringify({ ...ciConfig, boards: [] }));
    await page.click('#config-modal .modal__btn--save');
    await page.reload();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('config')||'{}'));
    expect(Array.isArray(stored.boards)).toBeTruthy();
  });

  test('removing config from localStorage shows popup again', async ({ page }) => {
    await page.goto(`/?config_base64=${b64(ciConfig)}`);
    await page.evaluate(() => localStorage.removeItem('config'));
    await page.reload();
    await expect(page.locator('#config-modal')).toBeVisible();
  });
});

// Building from services

test.describe('Dashboard Functionality - Building from Services', () => {
  test('user can add board, view, and widget from services', async ({ page }) => {
    const cfg = { ...ciConfig, boards: [{ id: 'b1', name: 'b1', order: 0, views: [{ id: 'v1', name: 'v1', widgetState: [] }] }] };
    await page.goto(`/?config_base64=${b64(cfg)}&services_base64=${b64(ciServices)}`);
    await ensurePanelOpen(page);
    await page.locator('#widget-selector-panel .widget-option').nth(1).click();
    await expect(page.locator('.widget-wrapper')).toHaveCount(1);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('boards')||'[]'));
    expect(stored.length).toBeGreaterThan(0);
  });
});

// Priority

test.describe('Dashboard Config - Priority and Overwriting', () => {
  test('base64 param overrides existing localStorage config', async ({ page }) => {
    await page.goto(`/?config_base64=${b64({ ...ciConfig, globalSettings: { theme: 'dark' } })}`);
    await page.reload();
    await page.goto(`/?config_base64=${b64({ ...ciConfig, globalSettings: { theme: 'light' } })}`);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('config')||'{}'));
    expect(stored.globalSettings.theme).toBe('light');
  });

  test('without new param, existing config remains active', async ({ page }) => {
    await page.goto(`/?config_base64=${b64({ ...ciConfig, globalSettings: { theme: 'dark' } })}`);
    await page.reload();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('config')||'{}'));
    expect(stored.globalSettings.theme).toBe('dark');
  });
});
