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
        // console.log(`[console:${entry.type}] ${entry.text}`);
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

  // network logs – auto-run and attach
  // network: [
  //   async ({ page }, use, testInfo) => {
  //     const net: NetworkLog[] = [];
  //     page.on('requestfinished', async r => {
  //       try {
  //         const res = await r.response();
  //         if (res)
  //           net.push({
  //             url: r.url(),
  //             status: res.status(),
  //             timing: r.timing(),
  //           });
  //       } catch (e) {
  //         // Silently ignore teardown race errors
  //         if (!/has been closed|browser has been closed/i.test(e.message))
  //           throw e; // rethrow unexpected errors
  //       }
  //     });
  //     await use(net);
  //     if (net.length)
  //       testInfo.attach('network-logs', {
  //         body: JSON.stringify(net, null, 2),
  //         contentType: 'application/json',
  //       });
  //   },
  //   { auto: true },
  // ],

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
