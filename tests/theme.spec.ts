import { test, expect } from './fixtures';
import { navigate, getConfigTheme } from './shared/common';

test.describe('theme switching', () => {
  test('reflects config and switches at runtime', async ({ page }) => {
    await navigate(page, '/');

    const cfgTheme = await getConfigTheme(page);
    expect(['light', 'dark']).toContain(cfgTheme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', cfgTheme);

    const initialLogo = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--logo-url').trim());
    if (cfgTheme === 'dark') {
      expect(initialLogo).toContain('/assets/asd-light.png');
    } else {
      expect(initialLogo).toContain('/assets/asd.png');
    }

    if (!(await page.locator('#config-modal').isVisible())) {
      await page.click('#open-config-modal');
    }
    await page.selectOption('#theme-select', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const darkLogo = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--logo-url').trim());
    expect(darkLogo).toContain('/assets/asd-light.png');

    await page.selectOption('#theme-select', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const lightLogo = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--logo-url').trim());
    expect(lightLogo).toContain('/assets/asd.png');
  });
});
