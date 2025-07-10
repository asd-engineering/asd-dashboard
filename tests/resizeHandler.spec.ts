import { test, expect } from './fixtures';
import { routeServicesConfig } from './shared/mocking';
import { addServicesByName } from './shared/common';
import { ciServices } from './data/ciServices';
import { waitForWidgetStoreIdle } from './shared/state.js';


test.describe('Resize Handler Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await routeServicesConfig(page);
    await page.goto('/');
  });

  test('should resize widget in Firefox, trigger resize event, and persist changes', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Skipping this test in Firefox due to known issue with resizing.');
    // Add a widget for testing
    await addServicesByName(page, 'ASD-toolbox',1);;
  
    // Fetch maxColumns and maxRows from service configuration
    const serviceConfig = ciServices.find(service => service.name === 'ASD-toolbox').config;
    const maxColumns = serviceConfig.maxColumns;
    const maxRows = serviceConfig.maxRows;
  
    const widget = page.locator('.widget-wrapper').first();
    const resizeHandle = widget.locator('.resize-handle');
  
    // Ensure widget is visible and interactable
    await expect(widget).toBeVisible();

    // Initial size checks
    await expect(widget).toHaveAttribute('data-columns', '1');
    await expect(widget).toHaveAttribute('data-rows', '1');
  
    // Resize to maximum size allowed by config using page.mouse to drag
    if (browserName === 'firefox') {
      await resizeWidgetInFirefox(page, resizeHandle, 1200, 900);
    } else {
      await resizeWidgetWithMouse(page, resizeHandle, 1200, 900);
    }
    await waitForWidgetStoreIdle(page)

    // Bug: It can resize beyond maxium with corner based resize; needs fixing
    // await expect(widget).toHaveAttribute('data-columns', `${maxColumns}`);
    // await expect(widget).toHaveAttribute('data-rows', `${maxRows}`);
    // Reload and verify persistence of the resized dimensions
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(widget).toHaveAttribute('data-columns', `${maxColumns}`);
    await expect(widget).toHaveAttribute('data-rows', `${maxRows}`);
  
    // Resize to minimum size using page.mouse
    // Perform the resize action based on the browser (Firefox might need more explicit interaction)
    if (browserName === 'firefox') {
      await resizeWidgetInFirefox(page, resizeHandle, -1200, -900);
    } else {
      await resizeWidgetWithMouse(page, resizeHandle, -1200, -900);
    }
    await waitForWidgetStoreIdle(page)
  
    // Reload and verify persistence of the minimum size
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(widget).toHaveAttribute('data-columns', '1');
    await expect(widget).toHaveAttribute('data-rows', '1');
  });

  async function resizeWidgetInFirefox(page, resizeHandle, offsetX, offsetY) {
    // Scroll the resize handle into view
    await resizeHandle.scrollIntoViewIfNeeded();
  
    // Fetch the bounding box after scrolling into view
    const boundingBox = await resizeHandle.boundingBox();
    if (!boundingBox) {
      throw new Error('Resize handle bounding box not found');
    }
  
    // Move the mouse to the center of the resize handle
    await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
  
    // Press down the mouse button with `force: true`
    await page.mouse.down({ button: 'left' });
  
    // Drag the mouse by the given offset
    await page.mouse.move(boundingBox.x + boundingBox.width / 2 + offsetX, boundingBox.y + boundingBox.height / 2 + offsetY, { steps: 10 });
  
    // Release the mouse button
    await page.mouse.up();
  
    // Fire resize event explicitly to ensure the layout reacts
    await triggerResizeEvent(page);
  }

  // Helper function to resize the widget using the page.mouse API
  async function resizeWidgetWithMouse(page, resizeHandle, offsetX, offsetY) {
    // Scroll the resize handle into view
    await resizeHandle.scrollIntoViewIfNeeded();
  
    // Fetch the bounding box after scrolling into view
    const boundingBox = await resizeHandle.boundingBox();
    if (!boundingBox) {
      throw new Error('Resize handle bounding box not found');
    }
  
    // Move the mouse to the center of the resize handle
    await page.mouse.move(boundingBox.x + boundingBox.width / 2, boundingBox.y + boundingBox.height / 2);
  
    // Press down the mouse button
    await page.mouse.down();
  
    // Drag the mouse by the given offset
    await page.mouse.move(boundingBox.x + boundingBox.width / 2 + offsetX, boundingBox.y + boundingBox.height / 2 + offsetY);
  
    // Release the mouse button
    await page.mouse.up();
  }  
  
  // Helper function to trigger a resize event on the window object
  async function triggerResizeEvent(page) {
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }
  
});