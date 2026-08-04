import { expect, test } from '@playwright/test';
import { adminLogin } from './helpers';

test.describe('RBAC — enforced server-side, not just hidden', () => {
  test('editor reaches the panel but the admin-only DELETE is blocked at the gateway (403)', async ({ page }) => {
    await adminLogin(page, 'editor');
    await expect(page).toHaveURL(/\/admin$/);

    await page.goto('/admin/projects');
    // UX: the editor is not shown Delete controls at all
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);

    // Server-side proof: a direct DELETE through the proxy (with the editor's real session cookie)
    // is rejected 403 by the gateway RolesGuard — not merely hidden in the UI.
    const list = await page.request.get('/api/admin/projects?limit=1');
    expect(list.ok()).toBeTruthy();
    const id = (await list.json()).data.items[0].id as string;
    const del = await page.request.delete(`/api/admin/projects/${id}`);
    expect(del.status()).toBe(403);
  });

  test('a visitor account cannot establish an admin session', async ({ page }) => {
    await adminLogin(page, 'visitor');
    // login is refused → stays on /admin/login with an error, never reaches the dashboard
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByText(/does not have admin access/i)).toBeVisible();
    // and the panel stays gated
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
