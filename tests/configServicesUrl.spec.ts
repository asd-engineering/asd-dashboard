// tests/configServicesUrl.spec.ts
import { test, expect } from "./fixtures";
import { ciConfig, ciBoards } from "./data/ciConfig";
import { ciServices } from "./data/ciServices";
import {
  b64,
  navigate,
  getServices
} from "./shared/common";
import { encodeConfig } from "../src/utils/compression.js";
import { applyKeyMap } from "../src/utils/keymap.js";
import { KEY_MAP } from "../src/utils/fragmentKeyMap.js";
import { FRAG_MINIMIZE_ENABLED } from "../src/utils/fragmentConstants.js";
import { minimizeDeep } from "../src/utils/minimizer.js";
import { DEFAULT_CONFIG_TEMPLATE } from "../src/storage/defaultConfig.js";
import { computeCRC32Hex } from "../src/utils/checksum.js";

/**
 * Helper to encode config for fragment URL
 */
async function encodeConfigForFragment(config: any): Promise<string> {
  const cfgDefaults = applyKeyMap(DEFAULT_CONFIG_TEMPLATE, KEY_MAP, 'encode');
  const cfgMinimized = FRAG_MINIMIZE_ENABLED ? minimizeDeep(config, cfgDefaults) : config;
  const cfgMapped = applyKeyMap(cfgMinimized, KEY_MAP, 'encode');
  const encoded = await encodeConfig(cfgMapped, { algo: 'deflate' });
  const checksum = computeCRC32Hex(JSON.stringify(cfgMapped));
  return `cfg=${encoded}&algo=deflate&cc=${checksum}`;
}

const externalServices = [
  { name: "External-Service-1", url: "http://external.com/service1" },
  { name: "External-Service-2", url: "http://external.com/service2" }
];

const alternateServices = [
  { name: "Alternate-Service-1", url: "http://alternate.com/service1" }
];

test.describe("config.servicesUrl - Fragment-based external service loading", () => {
  test("loads services from config.servicesUrl when present in fragment config", async ({ page }) => {
    // Create config with servicesUrl field
    const configWithServicesUrl = {
      ...ciConfig,
      servicesUrl: "https://example.com/external-services.json",
      boards: ciBoards
    };

    // Mock the external services endpoint
    await page.route("**/external-services.json", (route) =>
      route.fulfill({ json: externalServices })
    );

    // Mock default files to ensure they're not used
    await page.route("**/services.json", (route) =>
      route.fulfill({ json: ciServices })
    );
    await page.route("**/config.json", (route) =>
      route.fulfill({ json: ciConfig })
    );

    // Encode config as fragment
    const fragmentParams = await encodeConfigForFragment(configWithServicesUrl);
    await navigate(page, `/#${fragmentParams}`);

    // Verify external services were loaded (not default ciServices)
    const services = await getServices(page);

    expect(services.length).toBe(externalServices.length);
    expect(services.some((s: any) => s.name === "External-Service-1")).toBeTruthy();
    expect(services.some((s: any) => s.name === "External-Service-2")).toBeTruthy();

    // Verify default services were NOT loaded
    expect(services.some((s: any) => s.name === ciServices[0]?.name)).toBeFalsy();
  });

  test("config.servicesUrl works with relative URLs", async ({ page }) => {
    const configWithRelativeUrl = {
      ...ciConfig,
      servicesUrl: "/api/services.json",
      boards: ciBoards
    };

    await page.route("**/api/services.json", (route) =>
      route.fulfill({ json: externalServices })
    );

    const fragmentParams = await encodeConfigForFragment(configWithRelativeUrl);
    await navigate(page, `/#${fragmentParams}`);

    const services = await getServices(page);

    expect(services.length).toBe(externalServices.length);
    expect(services.some((s: any) => s.name === "External-Service-1")).toBeTruthy();
  });

  test("falls back to localStorage when config.servicesUrl fetch fails", async ({ page }) => {
    const configWithBadUrl = {
      ...ciConfig,
      servicesUrl: "https://example.com/missing-services.json",
      boards: ciBoards
    };

    // Return 404 for the external URL
    await page.route("**/missing-services.json", (route) =>
      route.fulfill({ status: 404 })
    );

    // Pre-populate localStorage with services
    await page.addInitScript((services) => {
      localStorage.setItem('services', JSON.stringify(services));
    }, ciServices);

    const fragmentParams = await encodeConfigForFragment(configWithBadUrl);
    await navigate(page, `/#${fragmentParams}`);

    const services = await getServices(page);

    // Should fall back to localStorage services
    expect(services.length).toBe(ciServices.length);
  });

  test("falls back to local services.json when config.servicesUrl is not set", async ({ page }) => {
    const configWithoutServicesUrl = {
      ...ciConfig,
      boards: ciBoards
      // No servicesUrl field
    };

    await page.route("**/services.json", (route) =>
      route.fulfill({ json: ciServices })
    );

    const fragmentParams = await encodeConfigForFragment(configWithoutServicesUrl);
    await navigate(page, `/#${fragmentParams}`);

    const services = await getServices(page);

    // Should use local services.json
    expect(services.length).toBe(ciServices.length);
  });
});

test.describe("config.servicesUrl - Priority order", () => {
  test("Priority 1: services_base64 param overrides config.servicesUrl", async ({ page }) => {
    const configWithServicesUrl = {
      ...ciConfig,
      servicesUrl: "https://example.com/external-services.json",
      boards: ciBoards
    };

    await page.route("**/external-services.json", (route) =>
      route.fulfill({ json: externalServices })
    );

    const fragmentParams = await encodeConfigForFragment(configWithServicesUrl);

    // Use both fragment config AND services_base64 param
    await navigate(
      page,
      `/?services_base64=${b64(alternateServices)}#${fragmentParams}`
    );

    const services = await getServices(page);

    // services_base64 should win (Priority 1)
    expect(services.length).toBe(alternateServices.length);
    expect(services.some((s: any) => s.name === "Alternate-Service-1")).toBeTruthy();

    // External services should NOT be loaded
    expect(services.some((s: any) => s.name === "External-Service-1")).toBeFalsy();
  });

  test("Priority 2: config.servicesUrl overrides services_url param", async ({ page }) => {
    const configWithServicesUrl = {
      ...ciConfig,
      servicesUrl: "https://example.com/external-services.json",
      boards: ciBoards
    };

    await page.route("**/external-services.json", (route) =>
      route.fulfill({ json: externalServices })
    );

    await page.route("**/alternate-services.json", (route) =>
      route.fulfill({ json: alternateServices })
    );

    const fragmentParams = await encodeConfigForFragment(configWithServicesUrl);

    // Use both fragment config AND services_url param
    await navigate(
      page,
      `/?services_url=/alternate-services.json#${fragmentParams}`
    );

    const services = await getServices(page);

    // config.servicesUrl should win (Priority 2 beats Priority 3)
    expect(services.length).toBe(externalServices.length);
    expect(services.some((s: any) => s.name === "External-Service-1")).toBeTruthy();

    // Alternate services should NOT be loaded
    expect(services.some((s: any) => s.name === "Alternate-Service-1")).toBeFalsy();
  });

  test("Priority 3: services_url param works when config.servicesUrl is not set", async ({ page }) => {
    const configWithoutServicesUrl = {
      ...ciConfig,
      boards: ciBoards
      // No servicesUrl
    };

    await page.route("**/param-services.json", (route) =>
      route.fulfill({ json: alternateServices })
    );

    const fragmentParams = await encodeConfigForFragment(configWithoutServicesUrl);

    await navigate(
      page,
      `/?services_url=/param-services.json#${fragmentParams}`
    );

    const services = await getServices(page);

    // services_url should work (Priority 3)
    expect(services.length).toBe(alternateServices.length);
    expect(services.some((s: any) => s.name === "Alternate-Service-1")).toBeTruthy();
  });

  test("Priority 4: localStorage is used when external fetch fails and no params", async ({ page }) => {
    const configWithBadUrl = {
      ...ciConfig,
      servicesUrl: "https://example.com/404.json",
      boards: ciBoards
    };

    await page.route("**/404.json", (route) =>
      route.fulfill({ status: 404 })
    );

    // Pre-populate localStorage
    await page.addInitScript((services) => {
      localStorage.setItem('services', JSON.stringify(services));
    }, ciServices);

    const fragmentParams = await encodeConfigForFragment(configWithBadUrl);
    await navigate(page, `/#${fragmentParams}`);

    const services = await getServices(page);

    // Should fall back to localStorage (Priority 4)
    expect(services.length).toBe(ciServices.length);
  });

  test("Priority 5: local services.json is lowest priority fallback", async ({ page }) => {
    const configWithoutServicesUrl = {
      ...ciConfig,
      boards: ciBoards
    };

    await page.route("**/services.json", (route) =>
      route.fulfill({ json: ciServices })
    );

    const fragmentParams = await encodeConfigForFragment(configWithoutServicesUrl);
    await navigate(page, `/#${fragmentParams}`);

    const services = await getServices(page);

    // Should use local file (Priority 5)
    expect(services.length).toBe(ciServices.length);
  });
});

test.describe("config.servicesUrl - Edge cases", () => {
  test("handles empty servicesUrl gracefully", async ({ page }) => {
    const configWithEmptyUrl = {
      ...ciConfig,
      servicesUrl: "",
      boards: ciBoards
    };

    await page.route("**/services.json", (route) =>
      route.fulfill({ json: ciServices })
    );

    const fragmentParams = await encodeConfigForFragment(configWithEmptyUrl);
    await navigate(page, `/#${fragmentParams}`);

    const services = await getServices(page);

    // Should fall back to local services.json
    expect(services.length).toBe(ciServices.length);
  });

  test("handles malformed JSON from config.servicesUrl endpoint", async ({ page }) => {
    const configWithBadEndpoint = {
      ...ciConfig,
      servicesUrl: "https://example.com/bad.json",
      boards: ciBoards
    };

    await page.route("**/bad.json", (route) =>
      route.fulfill({
        body: "not valid json{]",
        contentType: "application/json"
      })
    );

    await page.route("**/services.json", (route) =>
      route.fulfill({ json: ciServices })
    );

    const fragmentParams = await encodeConfigForFragment(configWithBadEndpoint);
    await navigate(page, `/#${fragmentParams}`);

    const services = await getServices(page);

    // Should fall back to local services.json
    expect(services.length).toBe(ciServices.length);
  });

  test("config.servicesUrl persists across page reloads", async ({ page }) => {
    const configWithServicesUrl = {
      ...ciConfig,
      servicesUrl: "https://example.com/persistent-services.json",
      boards: ciBoards
    };

    await page.route("**/persistent-services.json", (route) =>
      route.fulfill({ json: externalServices })
    );

    const fragmentParams = await encodeConfigForFragment(configWithServicesUrl);
    await navigate(page, `/#${fragmentParams}`);

    let services = await getServices(page);
    expect(services.length).toBe(externalServices.length);

    // Reload page (fragment should be cleared, but config persists in localStorage)
    await page.reload();

    services = await getServices(page);

    // Services should still be loaded from the URL in config
    expect(services.length).toBe(externalServices.length);
    expect(services.some((s: any) => s.name === "External-Service-1")).toBeTruthy();
  });

  test("updating config.servicesUrl loads new services on reload", async ({ page }) => {
    // First load with one servicesUrl
    const config1 = {
      ...ciConfig,
      servicesUrl: "https://example.com/services-v1.json",
      boards: ciBoards
    };

    await page.route("**/services-v1.json", (route) =>
      route.fulfill({ json: externalServices })
    );

    await page.route("**/services-v2.json", (route) =>
      route.fulfill({ json: alternateServices })
    );

    const fragmentParams1 = await encodeConfigForFragment(config1);
    await navigate(page, `/#${fragmentParams1}`);

    let services = await getServices(page);
    expect(services.some((s: any) => s.name === "External-Service-1")).toBeTruthy();

    // Update config with new servicesUrl
    const config2 = {
      ...ciConfig,
      servicesUrl: "https://example.com/services-v2.json",
      boards: ciBoards
    };

    const fragmentParams2 = await encodeConfigForFragment(config2);
    await navigate(page, `/#${fragmentParams2}`);

    await page.reload();
    services = await getServices(page);

    // Should now load from the new URL
    expect(services.some((s: any) => s.name === "Alternate-Service-1")).toBeTruthy();
    expect(services.some((s: any) => s.name === "External-Service-1")).toBeFalsy();
  });
});
