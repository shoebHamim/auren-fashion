import { expect, test } from '@playwright/test';

test('storefront home renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fashion, made to be worn.');
  await expect(page.getByRole('link', { name: 'Auren' })).toBeVisible();
});

test('API is reachable on the same origin as the site (PLAN §4.1)', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: 'ok' });
  expect(response.headers()['x-request-id']).toBeTruthy();
});

test('admin shell streams live system status from the API', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  const status = page.getByRole('definition').first();
  await expect(status).toHaveText('Ready');
});
