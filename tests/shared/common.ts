import { type Page, expect } from '@playwright/test';

// Helper function to add services
export async function addServices(page: Page, count: number) {
    for (let i = 0; i < count; i++) {
      await page.selectOption('#service-selector', { index: i + 1 });
      await page.click('#add-widget-button');
    }
  }
  
export async function selectServiceByName(page: Page, serviceName: string) {
    await page.selectOption('#service-selector', { label: serviceName });
    await page.click('#add-widget-button');
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
    return await page.evaluate(() => {
        const item = localStorage.getItem('boards');
        return item ? JSON.parse(item) : [];
    });
}

export async function addServicesByName(page: Page, serviceName: string, count: number) {
    for (let i = 0; i < count; i++) {
        await selectServiceByName(page, serviceName);
        await page.waitForTimeout(100);
    }
}
