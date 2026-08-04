import { type Page } from '@playwright/test';

export const CREDS = {
  admin: { email: 'admin@fardeen.local', password: 'Admin@12345' },
  editor: { email: 'editor@fardeen.local', password: 'Editor@12345' },
  visitor: { email: 'viewer@fardeen.local', password: 'Viewer@12345' },
};

/** Log in through the real /admin/login form. Does not assert success (callers decide). */
export async function adminLogin(page: Page, who: keyof typeof CREDS): Promise<void> {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(CREDS[who].email);
  await page.getByLabel('Password').fill(CREDS[who].password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

export function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}
