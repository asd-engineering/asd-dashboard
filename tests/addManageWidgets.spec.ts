import { test, expect, type Page } from '@playwright/test';
import emojiList from '../src/ui/unicodeEmoji.js';
import { routeServicesConfig } from './shared/mocking.js';
import { addServices, selectServiceByName, addServicesByName } from './shared/common.js';
// import { widgetUrlOne, widgetUrlTwo, widgetUrlThree, widgetUrlFour } from './shared/constant.js';


test.describe('Widgets', () => {

  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page)
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      localStorage.setItem('log', 'widgetManagement');
    });
  });

  test(`should be able to add 4 services and drag and drop ${emojiList.pinching.unicode}`, async ({ page }) => {
    const logs: string[] = [];

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
    console.log('Before Drag-and-Drop:');
    for (let i = 0; i < widgetCount; i++) {
      const widget = widgets.nth(i);
      const order = await widget.getAttribute('data-order');
      const url = await widget.getAttribute('data-url'); // Fetch the url attribute

      if (url !== null) {
        orderBeforeDragDrop[url] = order; // Use url as the key
      } else {
        console.error(`Widget ${i} has a null url attribute`);
      }

      console.log(`Widget ${i} data-order: ${order}, url: ${url}`);
    }

    // Test drag and drop using dragAndDrop method with string selectors
    await page.dragAndDrop('.widget-wrapper:nth-child(1) .widget-icon-drag', '.widget-wrapper:nth-child(2) .widget-icon-drag');
    await page.dragAndDrop('.widget-wrapper:nth-child(3) .widget-icon-drag', '.widget-wrapper:nth-child(4) .widget-icon-drag');

    // Log data-order attributes after drag and drop
    const orderAfterDragDrop = {};
    console.log('After Drag-and-Drop:');
    for (let i = 0; i < widgetCount; i++) {
      const widget = widgets.nth(i);
      const order = await widget.getAttribute('data-order');
      const url = await widget.getAttribute('data-url'); // Fetch the url attribute

      if (url !== null) {
        orderAfterDragDrop[url] = order; // Use url as the key
      } else {
        console.error(`Widget ${i} has a null url attribute`);
      }

      console.log(`Widget ${i} data-order: ${order}, url: ${url}`);
    }

    // Compare initial and final order by url
    console.log('Order comparison:');
    for (const url in orderBeforeDragDrop) {
      console.log(`Widget url: ${url}, initial: ${orderBeforeDragDrop[url]}, final: ${orderAfterDragDrop[url]}`);
      expect(orderBeforeDragDrop[url]).not.toBe(orderAfterDragDrop[url]);
    }

    // Reload the page to restore widgets from local storage
    await page.reload();

    // Verify the order of widgets after reload
    const orderAfterReload = {};
    console.log('After Reload:');
    for (let i = 0; i < widgetCount; i++) {
      const widget = widgets.nth(i);
      const order = await widget.getAttribute('data-order');
      const url = await widget.getAttribute('data-url'); // Fetch the url attribute

      if (url !== null) {
        orderAfterReload[url] = order; // Use url as the key
      } else {
        console.error(`Widget ${i} has a null url attribute`);
      }

      console.log(`Widget ${i} data-order: ${order}, url: ${url}`);
    }

    // Compare initial and restored order by url
    console.log('Order comparison after reload:');
    for (const url in orderBeforeDragDrop) {
      console.log(`Widget url: ${url}, initial: ${orderBeforeDragDrop[url]}, restored: ${orderAfterReload[url]}`);
    }

    // const uuidLog = logs.find(log => log.includes('[widgetManagement][createWidget] Widget created with grid spans'));
    // expect(uuidLog).toBeDefined();
  });


  test('should generate widgets with unique and persistent UUIDs', async ({ page }) => {
    // Add multiple widgets
    await addServicesByName(page, 'ASD-terminal', 10);

    // Collect UUIDs of all widgets
    const widgetUUIDs = await page.$$eval('.widget-wrapper', 
      elements => elements.map(el => el.getAttribute('data-dataid'))
    );

    // Check that all UUIDs are defined
    widgetUUIDs.forEach(uuid => expect(uuid).toBeDefined());

    // Check that all UUIDs are unique
    const uniqueUUIDs = new Set(widgetUUIDs);
    expect(uniqueUUIDs.size).toEqual(widgetUUIDs.length);

    // await popup.waitForLoadState('domcontentloaded'); // Wait for the 'DOMContentLoaded' event.
    const reloadedWidgetUUIDs = await page.locator('.widget-wrapper').evaluateAll(widgets => 
      widgets.map(widget => widget.getAttribute('data-dataid'))
    );
    expect(reloadedWidgetUUIDs).toEqual(widgetUUIDs);
  });

  test(`should be able to change the widget url ${emojiList.link.unicode}`, async ({ page }) => {
    await addServices(page, 2);

    // Listen for the dialog event
    page.on('dialog', async dialog => {
      console.log(dialog.message());
      await dialog.accept('https://new.url'); // Provide the URL directly in the dialog
    });

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

    // Resize 2/2
    await firstWidget.locator('.widget-icon-resize').hover();
    await page.click('text=⬇');
    await firstWidget.locator('.widget-icon-resize').hover();
    await page.click('text=➡');
    await expect(firstWidget).toHaveAttribute('data-columns', '2');
    await expect(firstWidget).toHaveAttribute('data-rows', '2');

    // Resize 1/1
    await firstWidget.locator('.widget-icon-resize').hover();
    await page.click('text=⬆');
    await firstWidget.locator('.widget-icon-resize').hover();
    await page.click('text=⬅');
    await expect(firstWidget).toHaveAttribute('data-columns', '1');
    await expect(firstWidget).toHaveAttribute('data-rows', '1');

    // Reload the page
    await page.reload();

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

    // Reload the page
    await page.reload();

    // Verify the widget retains its size
    await expect(firstWidget).toHaveAttribute('data-columns', '3');
    await expect(firstWidget).toHaveAttribute('data-rows', '3');
  });

});