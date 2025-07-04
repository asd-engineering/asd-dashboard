import { type Page, expect } from '@playwright/test';

// Helper function to add services
export async function addServices(page: Page, count: number) {
    for (let i = 0; i < count; i++) {
      await page.locator('#service-selector .service-option').nth(i + 1).click();
    }
  }
  
export async function selectServiceByName(page: Page, serviceName: string) {
    await page.click(`#service-selector .service-option:has-text("${serviceName}")`);
}

// Helper function to handle dialog interactions
export async function handleDialog(page, type, inputText = '') {
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe(type);
      if (type === 'prompt') {
        await dialog.accept(inputText);
      } else {
        await dialog.accept();
      }
    });
  }
  
  // Helper function to get boards from localStorage
export async function getBoardsFromLocalStorage(page) {
    return await page.evaluate(async () => {
      const result = window.asd.widgetStore.idle();
      if (result && typeof result.then === "function") await result;

      const item = localStorage.getItem('boards');
      return item ? JSON.parse(item) : [];
    });
}

export async function addServicesByName(page: Page, serviceName: string, count: number) {
    for (let i = 0; i < count; i++) {
        await selectServiceByName(page, serviceName);
    }
}
