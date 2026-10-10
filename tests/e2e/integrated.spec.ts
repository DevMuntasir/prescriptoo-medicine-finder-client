import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const origin = 'http://localhost:3000';
const suffix = randomUUID().slice(0, 8);
let slug = '',
  token = '';
const email = process.env.E2E_ADMIN_EMAIL || 'admin@example.test';
const password = process.env.E2E_ADMIN_PASSWORD || 'Local-test-password-2026';
test.beforeEach(async ({ page }) => {
  await page.route('https://maps.googleapis.com/maps/api/js**', route => route.abort());
});
test.beforeAll(async ({ request }) => {
  const login = await request.post('/api/v1/auth/sign-in/email', {
    headers: { Origin: origin },
    data: { email, password },
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  const call = async (path: string, data: unknown) => {
    const r = await request.post('/api/v1/' + path, { headers: { Origin: origin }, data });
    expect(r.ok(), await r.text()).toBeTruthy();
    return (await r.json()).data;
  };
  const ar = await request.get('/api/v1/admin/areas');
  const areas = (await ar.json()).data;
  const locality = areas.find(
    (a: { type: string; geometry?: { coordinates: number[][][][] } }) =>
      a.type === 'locality' && a.geometry?.coordinates[0][0].some((p) => p[0] === 90.3),
  );
  expect(locality).toBeTruthy();
  slug = 'e2e-medicine-' + suffix;
  const m = await call('admin/medicines', {
    slug,
    nameEn: 'E2E Medicine ' + suffix,
    nameBn: 'পরীক্ষার ওষুধ',
    genericEn: 'Test generic',
    strength: '500 mg',
    form: 'Tablet',
    category: 'Test',
  });
  const p = await call('admin/pharmacies', {
    nameEn: 'E2E Entrance ' + suffix,
    nameBn: 'পরীক্ষার ফার্মেসি',
    addressEn: 'Synthetic test entrance, Dhaka',
    addressBn: 'পরীক্ষার দোকানের প্রবেশপথ',
    localityId: locality.id,
    location: { latitude: 23.78, longitude: 90.38 },
    phone: '+8801700000000',
    hours: 'Test hours',
  });
  await call('admin/mappings', {
    medicineId: m.id,
    pharmacyId: p.id,
    active: true,
    stockStatus: 'unknown',
  });
  await call('admin/medicines/' + m.id + '/publish', { revision: 1 });
  const q = await call('admin/qrs', { medicineId: m.id });
  token = q.token;
});
test('mobile QR uses real GPS/search, selects exact shop and handles missing routing provider', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 23.78, longitude: 90.38, accuracy: 5 });
  await page.goto('/q/' + token);
  await expect(page.getByRole('heading', { name: 'পরীক্ষার ওষুধ' })).toBeVisible();
  await page.getByRole('button', { name: 'আমার অবস্থান ব্যবহার করুন' }).click();
  await expect(page.getByRole('heading', { name: 'পরীক্ষার ফার্মেসি' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'হাঁটা', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'পথ দেখুন', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Turn-by-turn directions are not enabled yet');
  await expect(page.getByRole('link', { name: 'Google Maps-এ নেভিগেশন খুলুন' })).toHaveAttribute(
    'href',
    /destination=23.78%2C90.38|destination=23.78,90.38/,
  );
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'E2E Entrance ' + suffix })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: '../docs/screenshots/integrated-qr-mobile.png', fullPage: true });
});
test('manual origin requires confirmation, map unavailable leaves list usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/en/medicines/' + slug + '/locator');
  await page.getByRole('button', { name: 'Choose an area or starting pin' }).click();
  await page.getByRole('button', { name: 'Set exact starting pin' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByText('Map unavailable / মানচিত্র অনুপলব্ধ')).toBeVisible();
  await modal.getByLabel('Latitude', { exact: true }).fill('23.78');
  await modal.getByLabel('Longitude', { exact: true }).fill('90.38');
  await modal.getByRole('button', { name: 'Confirm starting point', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'E2E Entrance ' + suffix })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Call shop' })).toBeVisible();
});
test('late route response cannot replace changed mode; second request stays usable', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 23.77, longitude: 90.38, accuracy: 5 });
  await page.goto('/q/' + token);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Use my location' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Entrance ' + suffix })).toBeVisible();
  let count = 0;
  const routeOrigins: Array<{ latitude: number; longitude: number }> = [];
  await page.route('**/api/v1/public/locator/route', async (r) => {
    count++;
    routeOrigins.push(r.request().postDataJSON().origin);
    const first = count === 1;
    if (first) await new Promise((resolve) => setTimeout(resolve, 600));
    await r.fulfill({
      json: {
        data: {
          distanceMeters: first ? 100 : 200,
          duration: '60s',
          polyline: '',
          steps: [
            {
              distanceMeters: 200,
              instruction: first ? 'Old walking response' : 'Current driving response',
            },
          ],
          warnings: [],
          locale: 'en',
        },
      },
    });
  });
  await page.getByRole('button', { name: 'Directions', exact: true }).click();
  await page.getByRole('button', { name: 'Driving', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Directions', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Directions', exact: true }).click();
  await expect(page.getByText('Current driving response')).toBeVisible();
  await expect(page.getByText('Old walking response')).toHaveCount(0);
  await expect(page.getByText('Following your live location')).toBeVisible();
  await context.setGeolocation({ latitude: 23.771, longitude: 90.38, accuracy: 5 });
  await expect.poll(() => count).toBe(3);
  expect(routeOrigins.at(-1)).toMatchObject({ latitude: 23.771, longitude: 90.38 });
});
test('admin login and medicine edit persist after refresh', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await page.goto('/admin/medicines');
  await page.getByLabel('Search', { exact: true }).fill('E2E Medicine ' + suffix);
  const row = page.getByRole('row').filter({ hasText: 'E2E Medicine ' + suffix });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Edit', exact: true }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel(/^Strength/).fill('650 mg');
  await modal.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await page.reload();
  await page.getByLabel('Search', { exact: true }).fill('E2E Medicine ' + suffix);
  await page
    .getByRole('row')
    .filter({ hasText: 'E2E Medicine ' + suffix })
    .getByRole('button', { name: 'Edit', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByLabel(/^Strength/)).toHaveValue('650 mg');
});
test('consent and queued deletion are real and survive reload', async ({ page }) => {
  await page.goto('/en/privacy');
  const toggle = page.getByRole('switch', { name: 'Optional exact-location analytics' });
  await expect(toggle).toBeEnabled();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: 'Delete my browser data' }).click();
  await expect(page.getByRole('status')).toContainText(/Deletion queued|Deletion completed/);
  await expect(page.getByRole('status')).toContainText('Deletion completed.', { timeout: 80000 });
});
test('responsive public/admin pages avoid horizontal overflow', async ({ page }) => {
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '/bn',
      '/en/medicines/' + slug,
      '/q/' + token,
      '/en/privacy',
      '/admin/login',
    ]) {
      await page.goto(path);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${width} ${path}`,
      ).toBeTruthy();
    }
  }
});
