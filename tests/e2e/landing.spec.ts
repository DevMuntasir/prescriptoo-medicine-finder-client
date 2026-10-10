import { test, expect } from '@playwright/test';

const medicine = (id: number, name = `Medicine ${id}`) => ({
  id: String(id),
  slug: `medicine-${id}`,
  name_en: name,
  name_bn: 'পরীক্ষার ওষুধ',
  generic_en: 'Test generic',
  generic_bn: 'পরীক্ষার জেনেরিক',
  strength: '500 mg',
  form: 'Tablet',
  category: 'Test',
  total: 13,
});

test('hero search queries the full catalogue and pagination keeps cards linked', async ({
  page,
}) => {
  await page.route('**/api/v1/public/medicines?**', async (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('q');
    await route.fulfill({
      json: {
        data: q
          ? [{ ...medicine(99, 'Search-only medicine'), total: 1 }]
          : url.searchParams.get('offset') === '12'
            ? [medicine(13)]
            : Array.from({ length: 12 }, (_, i) => medicine(i + 1)),
      },
    });
  });
  await page.goto('/en');
  await expect(page.locator('.acme-medicine-card')).toHaveCount(12);
  await page.getByRole('button', { name: 'Explore more medicines' }).click();
  await expect(page.locator('.acme-medicine-card')).toHaveCount(13);
  await page.getByRole('searchbox').fill('Search-only');
  await expect(page.locator('.acme-medicine-card')).toHaveCount(1);
  await expect(page.locator('.acme-medicine-card')).toHaveAttribute(
    'href',
    '/en/medicines/medicine-99',
  );
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('#medicines')).toBeFocused();
  await page.getByRole('button', { name: 'Clear search', exact: true }).first().click();
  await expect(page.locator('.acme-medicine-card')).toHaveCount(12);
  await page.screenshot({ path: 'test-results/acme-desktop.png', fullPage: true });
});

test('mobile Bengali layout, menu and recoverable API failure', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  let failed = true;
  await page.route('**/api/v1/public/medicines?**', (route) =>
    failed
      ? route.fulfill({ status: 503, json: { error: { message: 'Unavailable' } } })
      : route.fulfill({ json: { data: [{ ...medicine(1), total: 1 }] } }),
  );
  await page.goto('/bn');
  await expect(page.locator('.acme-error')).toContainText('ওষুধের তালিকা লোড করা যায়নি।');
  failed = false;
  await page.getByRole('button', { name: 'আবার চেষ্টা করুন' }).click();
  await expect(page.locator('.acme-medicine-card')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await expect(page.locator('#patient-navigation')).toBeVisible();
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await expect(page.locator('#patient-navigation')).not.toBeVisible();
  await page.screenshot({ path: 'test-results/acme-mobile.png', fullPage: true });
});
