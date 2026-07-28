import { expect, test } from '@playwright/test';
import { mockAdminApi } from './helpers.js';

test('admin login protects and opens dashboard', async ({ page }) => {
  await mockAdminApi(page);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByPlaceholder('Email').fill('admin@test.local');
  await page.getByPlaceholder('Password').fill('StrongPassword123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Operations overview')).toBeVisible();
});

test('authenticated admin can view jobs and statistics', async ({ page }) => {
  await mockAdminApi(page, { authenticated: true });
  await page.goto('/jobs');
  await expect(page.getByText('Civil Engineer Recruitment 2026')).toBeVisible();
  await page.goto('/statistics');
  await expect(page.getByText('Most Viewed Jobs')).toBeVisible();
  await expect(page.getByText('Total Jobs')).toBeVisible();
});
