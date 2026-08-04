import { expect, test } from '@playwright/test';

test.describe('Public marketing site', () => {
  test('home renders the hero + primary nav with live content', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Fardeen/i);
    await expect(page.locator('#hero-heading')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
    // live data: the page links out to the real sections
    await expect(page.getByRole('link', { name: /projects/i }).first()).toBeVisible();
  });

  test('contact form submits and shows the success state (201)', async ({ page }) => {
    await page.goto('/contact');
    const statuses: number[] = [];
    page.on('response', (r) => {
      if (r.url().includes('/api/v1/contact') && r.request().method() === 'POST') statuses.push(r.status());
    });
    await page.locator('#contact-name').fill('E2E Tester');
    await page.locator('#contact-email').fill('e2e@example.com');
    await page.locator('#contact-phone').fill('+91 98765 43210');
    await page.locator('#contact-subject').fill('E2E enquiry');
    await page.locator('#contact-message').fill('This enquiry was sent by the Playwright e2e suite.');
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText('Message received.')).toBeVisible(); // only shows on a 201 success
    expect(statuses).toContain(201);
  });

  test('quotation form submits and shows the success state', async ({ page }) => {
    await page.goto('/contact');
    await page.locator('#quote-name').fill('E2E Quoter');
    await page.locator('#quote-email').fill('quote-e2e@example.com');
    await page.locator('#quote-phone').fill('+91 90000 00000');
    await page.locator('#quote-projectType').fill('New villa');
    // pick at least one service (serviceSlugs checkboxes)
    const firstService = page.locator('input[type="checkbox"]').first();
    if (await firstService.count()) await firstService.check();
    await page.locator('#quote-details').fill('4BHK villa, e2e generated request.');

    await page.getByRole('button', { name: 'Request quotation' }).click();
    await expect(page.getByText('Quotation request received.')).toBeVisible();
  });

  test('projects list filters by category and opens a project detail page', async ({ page }) => {
    await page.goto('/projects');
    const filter = page.getByRole('navigation', { name: 'Filter projects by category' });
    await expect(filter).toBeVisible();

    // click the first real category chip (index 0 is "All")
    const categoryChip = filter.getByRole('link').nth(1);
    const catHref = await categoryChip.getAttribute('href');
    await categoryChip.click();
    await expect(page).toHaveURL(new RegExp('category='));
    expect(catHref).toContain('category=');

    // back to all, then open the first project detail
    await page.goto('/projects');
    const firstProject = page.locator('a[href^="/projects/"]').first();
    await expect(firstProject).toBeVisible();
    await firstProject.click();
    await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('projects pagination is link-based and navigable when present', async ({ page }) => {
    await page.goto('/projects');
    const pagination = page.getByRole('navigation', { name: 'Pagination' });
    if (await pagination.count()) {
      await expect(pagination).toBeVisible();
      const next = pagination.getByRole('link', { name: /next/i });
      if (await next.count()) {
        await next.click();
        await expect(page).toHaveURL(/page=2/);
      }
    } else {
      // single page of results — assert the grid rendered instead
      await expect(page.locator('a[href^="/projects/"]').first()).toBeVisible();
    }
  });
});
