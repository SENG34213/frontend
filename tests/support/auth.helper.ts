import { Page, expect } from '@playwright/test';

/**
 * Ensures the Playwright page session is logged in as a CUSTOMER.
 * Uses environment credentials if provided, or registers a unique test user.
 */
export async function authenticateCustomer(page: Page): Promise<string> {
  const envEmail = process.env['E2E_CUSTOMER_EMAIL'];
  const envPassword = process.env['E2E_CUSTOMER_PASSWORD'];

  const email = envEmail || 'e2e_customer@gamingcastle.test';
  const password = envPassword || 'Password123!';

  await page.goto('/login');
  await page.locator('#login-identifier').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: /initiate login/i }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  return email;
}
