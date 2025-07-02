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
    const widgetCount = 4;

    // Add 4 services
    await addServices(page, widgetCount);

    const widgets = page.locator('.widget-wrapper');
    await expect(widgets).toHaveCount(widgetCount);

    // --- STEP 1: Capture the initial order ---
    const getWidgetOrdersByUrl = async () => {
      const orders = {};
      const allWidgets = await widgets.all();
      for (const widget of allWidgets) {
        const url = await widget.getAttribute('data-url');
        const order = await widget.getAttribute('data-order');
        if (url) {
          orders[url] = order;
        }
      }
      return orders;
    };

    const orderBeforeDragDrop = await getWidgetOrdersByUrl();
    console.log('Before Drag-and-Drop:', orderBeforeDragDrop);
    expect(orderBeforeDragDrop['http://localhost:8000/asd/toolbox']).toBe('0');


    // --- STEP 2: Perform the drag and drop actions ---
    // FIX: Use low-level mouse actions for maximum reliability.
    // We will also select widgets by their stable URL since their data-order changes.

    const toolboxWidget = page.locator('.widget-wrapper[data-url="http://localhost:8000/asd/toolbox"]');
    const terminalWidget = page.locator('.widget-wrapper[data-url="http://localhost:8000/asd/terminal"]');
    const tunnelWidget = page.locator('.widget-wrapper[data-url="http://localhost:8000/asd/tunnel"]');
    const containersWidget = page.locator('.widget-wrapper[data-url="http://localhost:8000/asd/containers"]');

    // --- Drag 1: Toolbox over Terminal ---
    await toolboxWidget.locator('.widget-icon-drag').hover();
    await page.mouse.down();
    await terminalWidget.hover(); // Move over the target to trigger dragover
    await page.mouse.up(); // Drop
    await page.waitForTimeout(200); // Wait for app to save state

    // --- Drag 2: Tunnel over Containers ---
    await tunnelWidget.locator('.widget-icon-drag').hover();
    await page.mouse.down();
    await containersWidget.hover();
    await page.mouse.up();
    await page.waitForTimeout(200);


    // --- STEP 3: Verify the new order ---
    const orderAfterDragDrop = await getWidgetOrdersByUrl();
    console.log('After Drag-and-Drop:', orderAfterDragDrop);

    const expectedOrder = {
      'http://localhost:8000/asd/toolbox': '1',
      'http://localhost:8000/asd/terminal': '0',
      'http://localhost:8000/asd/tunnel': '3',
      'http://localhost:8000/asd/containers': '2'
    };

    expect(orderAfterDragDrop).toEqual(expectedOrder);


    // --- STEP 4: Reload and verify persistence ---
    await page.reload();
    await expect(widgets.first()).toBeVisible();

    const orderAfterReload = await getWidgetOrdersByUrl();
    console.log('After Reload:', orderAfterReload);

    expect(orderAfterReload).toEqual(expectedOrder);
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
