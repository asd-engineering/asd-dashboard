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

export async function addServicesByName(page: Page, serviceName: string, count: number) {
    for (let i = 0; i < count; i++) {
        await selectServiceByName(page, serviceName);
    }
}

export async function getUnwrappedConfig(page) {
  return await page.evaluate(() => {
    const raw = localStorage.getItem('config');
    const parsed = raw ? JSON.parse(raw) : null;

    const cfg = parsed?.data || parsed;

    if (!cfg || typeof cfg !== 'object') return { boards: [] };
    if (!Array.isArray(cfg.boards)) cfg.boards = [];

    return cfg;
  });
}

export async function getConfigBoards(page) {
  const cfg = await getUnwrappedConfig(page);
  return Array.isArray(cfg.boards) ? cfg.boards : [];
}

export async function getConfigTheme(page) {
  const cfg = await getUnwrappedConfig(page);
  return cfg?.globalSettings?.theme;
}

export async function getBoardWithWidgets(page) {
  const cfg = await getUnwrappedConfig(page);
  const boards = Array.isArray(cfg.boards) ? cfg.boards : [];
  return boards.find(b => b.views?.some(v => v.widgetState?.length > 0))?.id || null;
}

export async function getBoardCount(page) {
  const cfg = await getUnwrappedConfig(page);
  return Array.isArray(cfg.boards) ? cfg.boards.length : 0;
}

export async function getShowMenuWidgetFlag(page) {
  const cfg = await getUnwrappedConfig(page);
  return !!cfg?.globalSettings?.showMenuWidget;
}

export async function getLastUsedViewId(page) {
  return await page.evaluate(() => localStorage.getItem('lastUsedViewId'));
}

export async function getLastUsedBoardId(page) {
  return await page.evaluate(() => localStorage.getItem('lastUsedBoardId'));
}
