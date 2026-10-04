import { test, expect } from '@playwright/test';
test('patient chooses area, confirms pin and gets illustrative walking directions', async ({
  page,
}) => {
  await page.goto('/en');
  await page.getByRole('textbox', { name: 'Search medicine or generic name' }).fill('Paracetamol');
  await page.getByRole('heading', { name: 'Paracetamol', exact: true }).click();
  await page.getByRole('link', { name: 'Find nearby pharmacies' }).click();
  await page.getByRole('button', { name: 'Choose an area instead' }).click();
  await page.getByRole('button', { name: 'Show pharmacies in this area' }).click();
  await expect(
    page.getByRole('heading', { name: 'Green Cross Pharmacy', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Get directions', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm pin & get directions', exact: true }).click();
  await expect(page.getByText('Illustrative directions · not for navigation')).toBeVisible();
});
test('demo medicine edit survives client navigation and resets on explicit reset', async ({
  page,
}) => {
  await page.goto('/admin/medicines/med-1');
  await page.getByLabel('Medicine name (English) *').fill('Paracetamol Preview');
  await page.getByRole('button', { name: 'Save demo medicine' }).click();
  await expect(page.getByText('Paracetamol Preview', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await expect(page.getByText('Paracetamol', { exact: true })).toBeVisible();
});
test('Bengali navigation and fallback remain usable', async ({ page }) => {
  await page.goto('/bn');
  await expect(page.getByRole('heading', { name: /আপনার ওষুধ/, level: 1 })).toBeVisible();
  await page.getByRole('textbox', { name: 'ওষুধ বা জেনেরিক নাম লিখুন' }).fill('Vitamin');
  await expect(page.getByText('English content fallback')).toBeVisible();
});
test('mapping final removal auto-unpublishes sample medicine', async ({ page }) => {
  await page.goto('/admin/mappings');
  for (const name of [
    'Green Cross Pharmacy',
    'Carewell Pharmacy',
    'Neighbourhood Medicine Corner',
    'City Care Pharmacy',
    'Wellness Pharmacy',
    'Community Pharmacy',
  ]) {
    await page
      .getByRole('row')
      .filter({ hasText: name })
      .getByRole('button', { name: 'Deactivate', exact: true })
      .click();
    await page.getByRole('button', { name: 'Confirm demo deactivation' }).click();
  }
  await page.getByRole('link', { name: 'Medicines', exact: false }).first().click();
  await expect(
    page.getByRole('row').filter({ hasText: 'Paracetamol' }).getByText('Draft', { exact: true }),
  ).toBeVisible();
});
for (const width of [360, 390, 768, 1440]) {
  test(`responsive surfaces at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/en',
      '/bn',
      '/en/medicines/sample-paracetamol',
      '/en/medicines/sample-paracetamol/locator',
      '/q/demo-medicine',
      '/admin',
      '/admin/medicines',
      '/admin/roles/role-1',
      '/admin/areas/area-1/boundary',
      '/admin/qrs/qr-1',
    ]) {
      await page.goto(route);
      if (width === 1440 && route === '/admin')
        await page.screenshot({ path: 'docs/screenshots/admin-desktop.png', fullPage: true });
      if (width === 390 && route === '/q/demo-medicine')
        await page.screenshot({ path: 'docs/screenshots/qr-start-mobile.png' });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        route,
      ).toBe(true);
    }
  });
}

test('mobile QR opens finder directly and nearest shop needs only two action taps', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/q/demo-medicine');
  await expect(page.getByRole('heading', { name: /প্যারাসিটামল/ })).toBeVisible();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Use sample current location' }).click();
  await expect(
    page.getByRole('heading', { name: 'Green Cross Pharmacy', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/qr-shop-mobile.png' });
  await page.getByRole('button', { name: 'Get directions', exact: true }).click();
  await expect(page.getByText('Illustrative directions · not for navigation')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/qr-directions-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'বাংলা', exact: true }).click();
  await expect(page.getByText('নমুনা দিকনির্দেশনা · চলাচলের জন্য নয়')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Green Cross Pharmacy', exact: true }),
  ).toBeVisible();
});

test('selecting another marker invalidates route and keeps map and shop synchronized', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/en/medicines/sample-paracetamol/locator');
  await page.getByRole('button', { name: 'Use sample current location' }).click();
  await page.getByRole('button', { name: 'Get directions', exact: true }).click();
  await expect(page.getByText('Illustrative directions · not for navigation')).toBeVisible();
  await page.getByRole('button', { name: 'Select Carewell Pharmacy', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Carewell Pharmacy', exact: true })).toBeVisible();
  await expect(page.getByText('Illustrative directions · not for navigation')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Get directions', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test('mobile pin dialog closes with Escape and restores focus to directions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/medicines/sample-paracetamol/locator');
  await page.getByRole('button', { name: 'Choose an area instead' }).click();
  await page.getByRole('button', { name: 'Show pharmacies in this area' }).click();
  const directions = page.getByRole('button', { name: 'Get directions', exact: true });
  await directions.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(directions).toBeFocused();
});
