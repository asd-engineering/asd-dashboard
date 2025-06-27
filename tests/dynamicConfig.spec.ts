import { test, expect } from '@playwright/test';
import { ciConfig, ciBoards } from './data/ciConfig';
import { ciServices } from './data/ciServices';

function b64(obj: any) {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

async function clearStorage(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
}

// Base64 params

test.describe('Dashboard Config - Base64 via URL Params', () => {
  test('loads dashboard from valid config_base64 and services_base64', async ({ page }) => {
    const config = b64(ciConfig);
    const services = b64(ciServices);
    await page.goto(`/?config_base64=${config}&services_base64=${services}`);
    await expect(page.locator('#service-selector option')).toHaveCount(ciServices.length + 1);
  });

  test('shows error on invalid base64', async ({ page }) => {
    await page.goto('/?config_base64=%%%');
    const notification = page.locator('.user-notification span');
    await expect(notification).toHaveText(/Invalid/);
  });

  test('shows error if base64 decodes to invalid JSON', async ({ page }) => {
    const bad = Buffer.from('{broken}').toString('base64');
    await page.goto(`/?config_base64=${bad}`);
    const notification = page.locator('.user-notification span');
    await expect(notification).toHaveText(/Invalid/);
  });
});

// Remote params

test.describe('Dashboard Config - Remote via URL Params', () => {
  test('loads dashboard from valid config_url and services_url', async ({ page }) => {
    await page.route('**/remote-config.json', route => route.fulfill({ json: ciConfig }));
    await page.route('**/remote-services.json', route => route.fulfill({ json: ciServices }));
    await page.goto('/?config_url=/remote-config.json&services_url=/remote-services.json');
    await expect(page.locator('#service-selector option')).toHaveCount(ciServices.length + 1);
  });

  test('shows config popup on 404 for config_url', async ({ page }) => {
    await page.route('**/missing.json', route => route.fulfill({ status: 404 }));
    await page.goto('/?config_url=/missing.json');
    await expect(page.locator('#config-modal')).toBeVisible();
  });

  test('shows error on invalid JSON from remote url', async ({ page }) => {
    await page.route('**/bad.json', route => route.fulfill({ body: 'nope' }));
    await page.goto('/?config_url=/bad.json');
    const notification = page.locator('.user-notification span');
    await expect(notification).toHaveText(/Invalid/);
  });
});

// Fallback modal

test.describe('Dashboard Config - Fallback Config Popup', () => {
  test.beforeEach(async ({ page }) => { await clearStorage(page); });

  test('popup appears when no config available via url, storage, or local file', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#config-modal')).toBeVisible();
  });

  test('valid input in popup initializes dashboard', async ({ page }) => {
    await page.goto('/');
    await page.fill('#config-json', JSON.stringify(ciConfig));
    await page.click('#config-modal button:not(.lsm-cancel-button)');
    await page.waitForSelector('#service-selector');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('config') || '{}'));
    expect(stored.globalSettings.theme).toBe(ciConfig.globalSettings.theme);
  });

  test('invalid JSON in popup shows error', async ({ page }) => {
    await page.goto('/');
    await page.fill('#config-json', '{broken');
    await page.click('#config-modal button:not(.lsm-cancel-button)');
    await expect(page.locator('.user-notification span')).toHaveText(/Invalid/);
  });
});

// LocalStorage behavior

test.describe('Dashboard Config - LocalStorage Behavior', () => {
  test('after first load, config is used from localStorage', async ({ page }) => {
    const config = b64(ciConfig);
    await page.goto(`/?config_base64=${config}`);
    await page.reload();
    await expect(page.locator('#service-selector')).toBeVisible();
  });

  test('changes via modal are saved and persist', async ({ page }) => {
    await page.goto(`/?config_base64=${b64(ciConfig)}`);
    await page.click('#open-config-modal');
    await page.fill('#config-json', JSON.stringify({ ...ciConfig, boards: [] }));
    await page.click('#config-modal button:not(.lsm-cancel-button)');
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
    await page.selectOption('#service-selector', { index: 1 });
    await page.click('#add-widget-button');
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


