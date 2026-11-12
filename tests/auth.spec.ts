import { test, expect } from '@playwright/test';

test.describe('Gaming Castle - Authentication Flow', () => {
  // Test credentials retrieved from environment variables
  const customerEmail = process.env['E2E_CUSTOMER_EMAIL'];
  const customerPassword = process.env['E2E_CUSTOMER_PASSWORD'];

  // Dedicated one-off email for negative testing to prevent locking real accounts
  const invalidEmail = 'invalid.test.soldier@gamingcastle.test';
  const invalidPassword = 'WrongPassword!999';

  test.beforeEach(async ({ page }) => {
    // Ensure clean state before each test
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
  });

  test('1. Successful customer login', async ({ page }) => {
    // Skip only this test if real customer credentials are not configured in environment
    test.skip(
      !customerEmail || !customerPassword,
      'Skipping successful customer login: E2E_CUSTOMER_EMAIL and E2E_CUSTOMER_PASSWORD environment variables are not configured.'
    );

    // Open login page
    await page.goto('/login');

    // Fill credentials into the form
    await page.locator('#login-identifier').fill(customerEmail!);
    await page.locator('#login-password').fill(customerPassword!);

    // Click submit button
    const submitButton = page.getByRole('button', { name: /initiate login/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Verify navigation to customer dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify that JWT token and role are stored in localStorage
    const storedToken = await page.evaluate(() => localStorage.getItem('gc_access_token'));
    const storedRole = await page.evaluate(() => localStorage.getItem('gc_role'));

    expect(storedToken).toBeTruthy();
    expect(storedRole).toBe('CUSTOMER');
  });

  test('2. Invalid credentials displays error and keeps user on login page', async ({ page }) => {
    // Open login page
    await page.goto('/login');

    // Fill deliberately incorrect credentials for a non-existent account (single attempt)
    await page.locator('#login-identifier').fill(invalidEmail);
    await page.locator('#login-password').fill(invalidPassword);

    // Submit form
    const submitButton = page.getByRole('button', { name: /initiate login/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Verify error toast notification is displayed
    const errorToast = page.locator('.gc-toast-error');
    await expect(errorToast).toBeVisible({ timeout: 10000 });
    await expect(errorToast).toContainText(/sign in failed/i);

    // Verify user remains on login page
    await expect(page).toHaveURL(/\/login/);

    // Verify form input is retained and submit button is re-enabled
    await expect(page.locator('#login-identifier')).toHaveValue(invalidEmail);
    await expect(submitButton).toBeEnabled();
  });

  test('3. Unauthenticated route protection redirects to login with returnUrl', async ({ page }) => {
    // Clear localStorage to guarantee unauthenticated state
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());

    // Attempt to access protected customer dashboard directly
    await page.goto('/dashboard');

    // Verify authGuard redirects to /login with returnUrl parameter
    await expect(page).toHaveURL(/\/login\?returnUrl=(%2F|\/)dashboard/);

    // Verify that the login form heading is rendered
    const heading = page.getByRole('heading', { level: 1, name: /welcome back,\s*soldier/i });
    await expect(heading).toBeVisible();

    // Verify that login controls are accessible
    await expect(page.locator('#login-identifier')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.getByRole('button', { name: /initiate login/i })).toBeVisible();
  });
});
