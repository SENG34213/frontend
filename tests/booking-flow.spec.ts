import { test, expect } from '@playwright/test';
import { authenticateCustomer } from './support/auth.helper';

test.describe('Gaming Castle - End-to-End Customer Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as customer before running booking flows
    await authenticateCustomer(page);
  });

  test('1. Should load the booking portal and display station catalog with live summary', async ({ page }) => {
    // Navigate to bookings page
    await page.goto('/bookings');

    // Verify page header
    const heroTitle = page.getByRole('heading', { level: 1, name: /book your battle station/i });
    await expect(heroTitle).toBeVisible();

    // Verify the 3 booking steps are present
    await expect(page.getByRole('heading', { level: 2, name: /select your session/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /choose station/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /available games/i })).toBeVisible();

    // Verify stations are loaded from the backend
    const stationCards = page.locator('.consoles-grid .console-card');
    await expect(stationCards.first()).toBeVisible({ timeout: 10000 });
    const stationCount = await stationCards.count();
    expect(stationCount).toBeGreaterThan(0);

    // Verify Live Overview Booking Summary panel is rendered
    const summaryPanel = page.locator('.booking-summary-col .summary-panel');
    await expect(summaryPanel).toBeVisible();
    await expect(summaryPanel.getByRole('heading', { level: 2, name: /booking summary/i })).toBeVisible();
  });

  test('2. Should select a station, future slot, and game, updating pricing in real time', async ({ page }) => {
    await page.goto('/bookings');

    // 1. Select the first station
    const firstStation = page.locator('.consoles-grid .console-card').first();
    await expect(firstStation).toBeVisible({ timeout: 10000 });
    await firstStation.click();

    // 2. Select a future date from the calendar
    const futureDays = page.locator('.days-grid button.day-btn:not([disabled])');
    await expect(futureDays.first()).toBeVisible();
    // Click a future day (2nd enabled day or tomorrow)
    const dayToClick = (await futureDays.count()) > 1 ? futureDays.nth(1) : futureDays.first();
    await dayToClick.click();

    // 3. Select an available time slot
    const availableSlot = page.locator('.slots-grid button.slot-btn.available').first();
    await expect(availableSlot).toBeVisible({ timeout: 10000 });
    await availableSlot.click();
    await expect(availableSlot).toHaveClass(/selected/);

    // 4. Select an installed game
    const gameCard = page.locator('.games-grid .game-card').first();
    await expect(gameCard).toBeVisible({ timeout: 10000 });
    await gameCard.click();
    await expect(gameCard).toHaveClass(/selected/);

    // 5. Verify the summary panel reflects selections and enables checkout
    const proceedBtn = page.locator('button.proceed-btn');
    await expect(proceedBtn).toBeVisible();
    await expect(proceedBtn).toBeEnabled();

    // Verify price breakdown displays a valid LKR total
    const totalRow = page.locator('.booking-summary-col .total-row .total-val');
    await expect(totalRow).toContainText(/LKR\s+[0-9,.]+/i);
  });

  test('3. Should complete full checkout in payment modal and receive confirmed booking receipt', async ({ page }) => {
    await page.goto('/bookings');

    // 1. Select Station
    const firstStation = page.locator('.consoles-grid .console-card').first();
    await expect(firstStation).toBeVisible({ timeout: 10000 });
    await firstStation.click();

    // 2. Select Future Date
    const futureDays = page.locator('.days-grid button.day-btn:not([disabled])');
    const dayToClick = (await futureDays.count()) > 1 ? futureDays.nth(1) : futureDays.first();
    await dayToClick.click();

    // 3. Select Available Slot
    const availableSlot = page.locator('.slots-grid button.slot-btn.available').first();
    await expect(availableSlot).toBeVisible({ timeout: 10000 });
    await availableSlot.click();

    // 4. Select Game
    const gameCard = page.locator('.games-grid .game-card').first();
    await expect(gameCard).toBeVisible({ timeout: 10000 });
    await gameCard.click();

    // 5. Proceed to Payment Modal
    const proceedBtn = page.locator('button.proceed-btn');
    await expect(proceedBtn).toBeEnabled();
    await proceedBtn.click();

    // 6. Verify Payment Modal opens
    const paymentModal = page.locator('gc-bookings gc-modal');
    await expect(paymentModal.locator('.gc-modal-dialog')).toBeVisible();
    await expect(paymentModal.getByRole('heading', { level: 2, name: /complete reservation & payment/i })).toBeVisible();

    // 7. Verify / input card payment fields
    const cardholderInput = page.locator('#cardholder-name');
    if (!(await cardholderInput.inputValue())) {
      await cardholderInput.fill('Kasun Perera');
    }
    const cardNumberInput = page.locator('#card-number');
    if (!(await cardNumberInput.inputValue())) {
      await cardNumberInput.fill('4242 4242 4242 4242');
    }

    // 8. Confirm Payment & Booking
    const payButton = page.getByRole('button', { name: /pay LKR.*confirm/i });
    await expect(payButton).toBeVisible();
    await payButton.click();

    // 9. Verify Confirmation Receipt
    const receiptTitle = page.locator('.receipt-title');
    await expect(receiptTitle).toBeVisible({ timeout: 15000 });
    await expect(receiptTitle).toHaveText(/reservation confirmed!/i);

    // Verify digital receipt details
    const receiptBox = page.locator('.receipt-details-box');
    await expect(receiptBox).toContainText(/booking reference:/i);
    await expect(receiptBox).toContainText(/GC-[A-Z0-9]+/i);
    await expect(receiptBox).toContainText(/amount paid:/i);

    // 10. Close Receipt Modal
    const doneButton = page.getByRole('button', { name: /^done$/i });
    await expect(doneButton).toBeVisible();
    await doneButton.click();
    await expect(paymentModal.locator('.gc-modal-dialog')).not.toBeVisible();
  });
});
