import { test, expect } from '@playwright/test';

test.describe('Gaming Castle - Smoke Tests', () => {
  test('should load the Angular application at root URL and redirect unauthenticated users to login', async ({ page }) => {
    // Navigate to root URL
    await page.goto('/');

    // Verify application title
    await expect(page).toHaveTitle(/Gaming Castle/i);

    // Unauthenticated visitors are guarded by authGuard and redirected to /login
    await expect(page).toHaveURL(/\/login/);

    // Verify that the Angular root component has loaded
    const appRoot = page.locator('app-root');
    await expect(appRoot).toBeVisible();
  });

  test('should display the login page with its heading, form controls, and submit button', async ({ page }) => {
    // Navigate directly to the login route
    await page.goto('/login');

    // Verify application title
    await expect(page).toHaveTitle(/Gaming Castle/i);

    // Verify main heading
    const heading = page.getByRole('heading', { level: 1, name: /welcome back,\s*soldier/i });
    await expect(heading).toBeVisible();

    // Verify subtitle
    await expect(page.getByText('Sign in to book a slot and join tournaments.')).toBeVisible();

    // Verify accessible form inputs for email and password
    const emailInput = page.getByLabel(/user email/i);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');

    const passwordInput = page.getByLabel(/security code/i);
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Verify submit button
    const submitButton = page.getByRole('button', { name: /initiate login/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();

    // Verify navigation links for password recovery and account registration
    await expect(page.getByRole('link', { name: /forgot password\?/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create an account/i })).toBeVisible();
  });
});
