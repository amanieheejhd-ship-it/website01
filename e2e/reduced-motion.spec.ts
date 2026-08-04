import { expect, test } from '@playwright/test';

test.describe('Reduced motion', () => {
  test('with prefers-reduced-motion, NO canvas mounts and the full static content renders', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // the cinematic WebGL canvas must not mount under reduced motion
    await expect(page.locator('canvas')).toHaveCount(0);

    // full static content is present (SSR / no-JS / reduced-motion variant)
    await expect(page.locator('#hero-heading')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    await expect(page.getByRole('link', { name: /projects/i }).first()).toBeVisible();

    // still absent after hydration settles
    await page.waitForTimeout(1500);
    await expect(page.locator('canvas')).toHaveCount(0);
  });
});
