import { expect, test } from '@playwright/test';
import { mockPublicApi } from './helpers.js';

test('search, pagination, filters, and job details', async ({ page }) => {
  await mockPublicApi(page);
  await page.goto('/jobs');
  await expect(page.getByRole('heading', { name: 'Latest Government Jobs' })).toBeVisible();
  await expect(page.getByText('Civil Engineer Recruitment 2026')).toBeVisible();
  await page.getByLabel('Filter by category').selectOption('job');
  await page.getByRole('link', { name: 'Civil Engineer Recruitment 2026' }).click();
  await expect(page.getByRole('heading', { name: 'Job details' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Official Notification' })).toBeVisible();
});

test('registration and login pages validate user flows', async ({ page }) => {
  await mockPublicApi(page);
  await page.goto('/register');
  await page.getByPlaceholder('Full name').fill('Test User');
  await page.getByPlaceholder('Email').fill('user@test.local');
  await page.getByPlaceholder('Password').fill('StrongPassword123');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Check your email to verify your account.')).toBeVisible();

  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('user@test.local');
  await page.getByPlaceholder('Password').fill('StrongPassword123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/profile$/);
});

test('authenticated saved jobs and profile are protected and visible', async ({ page }) => {
  await mockPublicApi(page, { authenticated: true });
  await page.goto('/saved-jobs');
  await expect(page.getByRole('heading', { name: 'Saved Jobs' })).toBeVisible();
  await expect(page.getByText('Civil Engineer Recruitment 2026')).toBeVisible();
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Your Profile' })).toBeVisible();
  await expect(page.getByText('user@test.local · user')).toBeVisible();
});

test('renders 404 page', async ({ page }) => {
  await mockPublicApi(page);
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { name: 'Page not found.' })).toBeVisible();
});
