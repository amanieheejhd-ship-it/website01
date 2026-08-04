import { expect, test } from '@playwright/test';
import { adminLogin } from './helpers';

test.describe('Admin panel', () => {
  test('unauthenticated /admin redirects to the login page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('admin logs in → dashboard shows live counters', async ({ page }) => {
    await adminLogin(page, 'admin');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Published projects')).toBeVisible();
    await expect(page.getByText('Active services')).toBeVisible();
  });

  test('admin creates a project in the UI → it appears on the public site, then edits + deletes it', async ({ page }) => {
    // The public /projects page is ISR-cached (revalidate=60) under `next start`, so allow the public
    // reflection to become eventually-consistent. (Under `next dev` it is immediate.)
    test.setTimeout(300_000);
    const stamp = Date.now().toString(36);
    const slug = `e2e-villa-${stamp}`;
    const title = `E2E Villa ${stamp}`;
    const editedTitle = `${title} (edited)`;
    await adminLogin(page, 'admin');
    await expect(page).toHaveURL(/\/admin$/);

    // ── create ──
    await page.goto('/admin/projects/new');
    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Slug').fill(slug);
    await page.getByLabel('Category').selectOption({ index: 1 });
    await page.getByLabel('Year').fill('2025');
    await page.getByLabel('Status').selectOption('published');
    await page.getByRole('button', { name: /create project/i }).click();
    await expect(page).toHaveURL(/\/admin\/projects$/);
    await expect(page.getByRole('link', { name: title })).toBeVisible();

    // ── appears on the PUBLIC site (eventually-consistent through ISR) ──
    await expect(async () => {
      await page.goto('/projects', { waitUntil: 'domcontentloaded' });
      expect(await page.locator(`a[href="/projects/${slug}"]`).count()).toBeGreaterThan(0);
    }).toPass({ timeout: 90_000, intervals: [3000, 5000] });

    // ── edit → reflected in the list ──
    await page.goto('/admin/projects');
    await page.getByRole('link', { name: title }).click();
    await expect(page).toHaveURL(/\/admin\/projects\/[a-f0-9-]+/);
    await page.getByLabel('Title').fill(editedTitle);
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page).toHaveURL(/\/admin\/projects$/);
    await expect(page.getByRole('link', { name: editedTitle })).toBeVisible();

    // ── delete (admin only) → confirm dialog ──
    await page.getByRole('row', { name: editedTitle }).getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('link', { name: editedTitle })).toHaveCount(0);

    // ── gone from the public site (eventually-consistent through ISR) ──
    await expect(async () => {
      await page.goto('/projects', { waitUntil: 'domcontentloaded' });
      expect(await page.locator(`a[href="/projects/${slug}"]`).count()).toBe(0);
    }).toPass({ timeout: 90_000, intervals: [3000, 5000] });
  });
});
