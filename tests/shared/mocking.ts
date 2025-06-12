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
}

