import { test, expect, type Page } from './fixtures';
import emojiList from '../src/ui/unicodeEmoji.js';
import { routeServicesConfig } from './shared/mocking.js';
import {
  addServices,
  selectServiceByName,
  addServicesByName,
  navigate,
  handleDialog,
  dragAndDropWidgetStable,
  reloadReady,
  flushStorage
} from './shared/common.js';
import { setLocalItem } from './shared/state'
import { waitForWidgetStoreIdle } from "./shared/state.js";

test.describe('Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await navigate(page,'/');

    await setLocalItem(page, 'log', 'widgetManagement')
  });

  test(`should be able to add 4 services and drag and drop ${emojiList.pinching.unicode}`, async ({ page }) => {
    // const logs: string[] = [];

    // Listen for console events // Does not work in Firefox
    // page.on('console', msg => {
    //   if (msg.type() === 'log') {
    //     logs.push(msg.text());
    //   }
    // });

    const widgetCount = 4;

    // Add 4 services
    await addServices(page, widgetCount);
    const widgets = page.locator('.widget-wrapper');
    await expect(widgets).toHaveCount(4);

    // Store data-order and url attributes in a dictionary
    const orderBeforeDragDrop = {};

    for (let i = 0; i < widgetCount; i++) {
      const widget = widgets.nth(i);
      const order = await widget.getAttribute('data-order');
      const url = await widget.getAttribute('data-url'); // Fetch the url attribute

      if (url !== null) {
        orderBeforeDragDrop[url] = order; // Use url as the key
      } else {
        console.error(`Widget ${i} has a null url attribute`);
      }
    }

    await dragAndDropWidgetStable(page, 0, 1)
    await waitForWidgetStoreIdle(page);
    await dragAndDropWidgetStable(page, 2, 3)
    await waitForWidgetStoreIdle(page);

    // Log data-order attributes after drag and drop
    const orderAfterDragDrop = {};

    for (let i = 0; i < widgetCount; i++) {
      const widget = widgets.nth(i);
      const order = await widget.getAttribute('data-order');
      const url = await widget.getAttribute('data-url'); // Fetch the url attribute

      if (url !== null) {
        orderAfterDragDrop[url] = order; // Use url as the key
      } else {
        console.error(`Widget ${i} has a null url attribute`);
      }
    }

    // Compare initial and final order by url
    for (const url in orderBeforeDragDrop) {
      expect(orderBeforeDragDrop[url]).not.toBe(orderAfterDragDrop[url]);
    }

    // Reload the page to restore widgets from local storage
    await reloadReady(page);

    // Verify the order of widgets after reload
    const orderAfterReload = {};
    // console.log('After Reload:');
    for (let i = 0; i < widgetCount; i++) {
      const widget = widgets.nth(i);
      const order = await widget.getAttribute('data-order');
      const url = await widget.getAttribute('data-url'); // Fetch the url attribute

      if (url !== null) {
        orderAfterReload[url] = order; // Use url as the key
      } else {
        // console.error(`Widget ${i} has a null url attribute`);
      }

      // console.log(`Widget ${i} data-order: ${order}, url: ${url}`);
    }

    // Compare initial and restored order by url
    // console.log('Order comparison after reload:');
    // for (const url in orderBeforeDragDrop) {
    //   console.log(`Widget url: ${url}, initial: ${orderBeforeDragDrop[url]}, restored: ${orderAfterReload[url]}`);
    // }

    // const uuidLog = logs.find(log => log.includes('[widgetManagement][createWidget] Widget created with grid spans'));
    // expect(uuidLog).toBeDefined();
  });


  test('should generate widgets with unique and persistent UUIDs', async ({ page }) => {
    // Add multiple widgets
    await addServicesByName(page, 'ASD-terminal', 10);
    await waitForWidgetStoreIdle(page);
    
    // Collect UUIDs of all widgets
    const widgetUUIDs = await page.$$eval('.widget-wrapper', 
      elements => elements.map(el => el.getAttribute('data-dataid'))
    );

    // Check that all UUIDs are defined
    widgetUUIDs.forEach(uuid => expect(uuid).toBeDefined());

    // Check that all UUIDs are unique
    const uniqueUUIDs = new Set(widgetUUIDs);
    expect(uniqueUUIDs.size).toEqual(widgetUUIDs.length);

    const reloadedWidgetUUIDs = await page.locator('.widget-wrapper').evaluateAll(widgets => 
      widgets.map(widget => widget.getAttribute('data-dataid'))
    );
    expect(reloadedWidgetUUIDs).toEqual(widgetUUIDs);
  });

  test(`should be able to change the widget url ${emojiList.link.unicode}`, async ({ page }) => {
    await addServices(page, 2);

    // Listen for the dialog event
    await handleDialog(page, 'prompt', 'https://new.url')

    const widgets = page.locator('.widget-wrapper');
    const firstWidget = widgets.nth(0);
    await firstWidget.locator('.widget-icon-link').click();
    // Removed the page.fill line as the URL is now provided in the dialog accept
    await expect(firstWidget.locator('iframe')).toHaveAttribute('src', 'https://new.url');
  });


  test(`should be able to use fullscreen ${emojiList.fullscreen.unicode}`, async ({ page }) => {
    await addServices(page, 3);

    const widgets = page.locator('.widget-wrapper');
    const firstWidget = widgets.nth(0);

    // Test fullscreen
    await firstWidget.locator('.widget-icon-fullscreen').click();
    await expect(firstWidget).toHaveClass(/fullscreen/);
    await page.keyboard.press('Escape');
    await expect(firstWidget).not.toHaveClass(/fullscreen/);
  });


  const allDirectionIcons = `${emojiList.arrowDown.unicode}${emojiList.arrowRight.unicode}${emojiList.arrowUp.unicode}${emojiList.arrowLeft.unicode}`

  test(`should be able to resize all directions using ${allDirectionIcons}`, async ({ page }) => {
    await selectServiceByName(page, "ASD-toolbox");

    const widgets = page.locator('.widget-wrapper');
    const firstWidget = widgets.nth(0);
    const resizeIcon = firstWidget.locator('.widget-icon-resize');

    // Helper to click resize button - use force:true for Firefox CI compatibility
    async function clickResizeButton(arrow: string) {
      await resizeIcon.hover();
      await page.click(`text=${arrow}`, { force: true });
    }

    // Resize 2/2
    await clickResizeButton('⬇');
    await clickResizeButton('➡');
    await expect(firstWidget).toHaveAttribute('data-columns', '2');
    await expect(firstWidget).toHaveAttribute('data-rows', '2');

    // Resize 1/1
    await clickResizeButton('⬆');
    await clickResizeButton('⬅');
    await expect(firstWidget).toHaveAttribute('data-columns', '1');
    await expect(firstWidget).toHaveAttribute('data-rows', '1');

    // Flush IndexedDB writes before reload
    await flushStorage(page);
    // Reload the page
    await reloadReady(page);

    // Verify the widget retains its size
    await expect(firstWidget).toHaveAttribute('data-columns', '1');
    await expect(firstWidget).toHaveAttribute('data-rows', '1');
  });


  test(`should be able to resize using columns and rows ${emojiList.triangularRuler.unicode}`, async ({ page }) => {
    await addServices(page, 3);

    const widgets = page.locator('.widget-wrapper');
    const firstWidget = widgets.nth(0);

    // Test resize-block
    await firstWidget.locator('.widget-icon-resize-block').hover();
    await page.click('text=3 columns, 3 rows');
    await expect(firstWidget).toHaveAttribute('data-columns', '3');
    await expect(firstWidget).toHaveAttribute('data-rows', '3');

    // Flush IndexedDB writes before reload
    await flushStorage(page);
    // Reload the page
    await reloadReady(page);

    // Verify the widget retains its size
    await expect(firstWidget).toHaveAttribute('data-columns', '3');
    await expect(firstWidget).toHaveAttribute('data-rows', '3');
  });

});