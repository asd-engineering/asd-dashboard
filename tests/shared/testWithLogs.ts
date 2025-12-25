// tests/shared/testWithLogs.ts
import * as pw from 'playwright/test';

const base = pw.test;

// re-export everything except we’ll override `test`
export {
  expect,
  devices,
  defineConfig,
  chromium,
  firefox,
  webkit,
  request,
  type Page,
} from 'playwright/test';

type ConsoleLog = { type: string; text: string };
type NetworkLog = { url: string; status: number; timing: any };

/**
 * Feature flag for network logs
 * - Disabled by default.
 * - Enable by setting one of the following environment variables:
 *   - PW_NETWORK_LOGS=1|true|on|yes
 *   - ASD_PW_NETWORK_LOGS=1|true|on|yes (fallback name)
 *
 * Rationale: keep the fixture wired into tests (auto) but no-op when disabled,
 * avoiding event listener overhead and attachments in CI unless explicitly enabled.
 */
const flagVal =
  (process.env.PW_NETWORK_LOGS ?? process.env.ASD_PW_NETWORK_LOGS ?? '').toLowerCase();
const NETWORK_LOGS_ENABLED =
  flagVal === '1' || flagVal === 'true' || flagVal === 'on' || flagVal === 'yes';

export const test = base.extend<{
  console: ConsoleLog[];
  network: NetworkLog[];
  app: any[];
}>({
  // console logs – auto-run and attach
  console: [
    async ({ page }, use, testInfo) => {
      const logs: ConsoleLog[] = [];
      page.on('console', msg => {
        const entry = { type: msg.type(), text: msg.text() };
        logs.push(entry);
        // 👇 Real-time terminal print
        console.log(`[console:${entry.type}] ${entry.text}`);
      });
      await use(logs);
      if (logs.length) {
        testInfo.attach('console-logs', {
          body: JSON.stringify(logs, null, 2),
          contentType: 'application/json',
        });
      }
    },
    { auto: true },
  ],

  // network logs – auto-run and attach (feature-flagged)
  network: [
    async ({ page }, use, testInfo) => {
      // If disabled, provide empty logs and skip all listeners/attachments.
      if (!NETWORK_LOGS_ENABLED) {
        await use([]);
        return;
      }

      const net: NetworkLog[] = [];
      page.on('requestfinished', async r => {
        try {
          const res = await r.response();
          if (res)
            net.push({
              url: r.url(),
              status: res.status(),
              timing: r.timing(),
            });
        } catch (e: any) {
          // Silently ignore teardown race errors
          if (!/has been closed|browser has been closed/i.test(e.message))
            throw e; // rethrow unexpected errors
        }
      });
      await use(net);
      if (net.length)
        testInfo.attach('network-logs', {
          body: JSON.stringify(net, null, 2),
          contentType: 'application/json',
        });
    },
    { auto: true }, // keep auto to preserve original behavior; flag makes it a no-op when disabled
  ],

  // in-app Logger logs – auto-run and attach
  app: [
    async ({ page }, use, testInfo) => {
      const appLogs = await page.evaluate(() => (window as any)._appLogs || []);
      await use(appLogs);
      if (appLogs.length)
        testInfo.attach('app-logs', {
          body: JSON.stringify(appLogs, null, 2),
          contentType: 'application/json',
        });
    },
    { auto: true },
  ],
});
