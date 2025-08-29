import { type Page } from '@playwright/test';
import { ciConfig } from '../data/ciConfig';
import { ciServices } from '../data/ciServices';


export async function routeServicesConfig(page: Page) {
    // Mock services.json
    await page.route('**/services.json', async route => {
    const json = ciServices;
    await route.fulfill({ json });
    });

    await page.route('**/config.json', async route => {
    const json = ciConfig;
    await route.fulfill({ json });
    });

    // Mock individual service APIs
    await page.route('**/asd/toolbox', route => {
    route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ "name": "ASD-toolbox" })
    });
    });

    await page.route('**/asd/terminal', route => {
    route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ "name": "ASD-terminal" })
    });
    });

    await page.route('**/asd/tunnel', route => {
    route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ "name": "ASD-tunnel" })
    });
    });

    await page.route('**/asd/containers', route => {
    route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ "name": "ASD-containers" })
    });
    });

    await page.route('**/asd/templated', route => {
    route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ "name": "ASD-templated" })
    });
    });
}

/**
 * Parameterized router: serve provided cfg/svc; fallback to CI fixtures.
 */
export async function routeConfigAndServices(page: Page, opts?: { config?: any; services?: any }) {
  const cfg = opts?.config ?? ciConfig;
  const svc = opts?.services ?? ciServices;

  await page.route('**/config.json', route => route.fulfill({ json: cfg }));
  await page.route('**/services.json', route => route.fulfill({ json: svc }));
}

/**
 * Route config/services AND set widgetStore.maxSize early.
 * Mirrors ad-hoc routeLimits() used in widget limits tests.
 */
export async function routeWithWidgetStoreSize(
  page: Page,
  boards: any[],
  services: any[],
  maxSize = 2,
  configOverrides: Record<string, any> = {}
) {
  await page.route('**/services.json', route => route.fulfill({ json: services }));
  await page.route('**/config.json', route =>
    route.fulfill({ json: { ...ciConfig, ...configOverrides, boards } }),
  );
  await page.addInitScript((size) => {
    const apply = () => {
      if ((window as any).asd?.widgetStore) {
        (window as any).asd.widgetStore.maxSize = size;
      } else {
        setTimeout(apply, 0);
      }
    };
    apply();
  }, maxSize);
}