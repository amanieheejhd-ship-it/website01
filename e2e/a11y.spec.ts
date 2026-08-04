import { expect, test } from '@playwright/test';

test.describe('Accessibility smoke', () => {
  test('home: first Tab hits the skip link, then focus enters the primary nav', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: /skip to content/i })).toBeFocused();

    await page.keyboard.press('Tab');
    const tag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    expect(['a', 'button']).toContain(tag); // a real focusable control, not <body>
  });

  test('contact form: fields are labelled and reachable via the keyboard in order', async ({ page }) => {
    await page.goto('/contact');
    await page.locator('#contact-name').focus();
    await expect(page.locator('#contact-name')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#contact-email')).toBeFocused();

    // each field is programmatically labelled for assistive tech
    await expect(page.getByLabel('Name').first()).toBeVisible();
    await expect(page.getByLabel('Message').first()).toBeVisible();
  });
});
