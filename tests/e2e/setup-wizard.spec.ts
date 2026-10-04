import { test, expect } from '@playwright/test';

test('medicine setup retains entries, stages pharmacies and saves one reviewed payload', async ({
  page,
}) => {
  const saved: Record<string, unknown>[] = [];
  let fail = true;
  await page.route('**/api/v1/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/medicine-setup')) {
      saved.push(route.request().postDataJSON());
      if (fail) {
        fail = false;
        return route.fulfill({
          status: 409,
          json: {
            error: {
              code: 'DUPLICATE_WARNING',
              message: 'Similar record exists; provide an override reason',
            },
          },
        });
      }
      return route.fulfill({ json: { data: { id: 'saved' } } });
    }
    if (path.endsWith('/pharmacy-entrance-areas'))
      return route.fulfill({ json: { data: [{ id: 'locality', name_en: 'Dhanmondi' }] } });
    if (path.endsWith('/me')) return route.fulfill({ json: { data: { permissions: ['*'] } } });
    return route.fulfill({
      json: {
        data: {
          items: path.endsWith('/pharmacies')
            ? [{ id: 'existing', name_en: 'Existing Pharmacy', address_en: 'Road 1' }]
            : [],
          total: path.endsWith('/pharmacies') ? 1 : 0,
        },
      },
    });
  });
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.goto('/admin/medicines');
  await page.getByRole('button', { name: 'Add medicine', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Medicine name', { exact: true }).fill('Test Medicine');
  await dialog.getByLabel('Generic name', { exact: true }).fill('Test generic');
  await dialog.getByRole('button', { name: 'Next: choose pharmacies' }).click();
  await dialog.getByRole('checkbox', { name: 'Existing Pharmacy Road 1' }).check();
  await dialog.getByRole('button', { name: '+ Add a new pharmacy' }).click();
  await dialog.getByLabel('Pharmacy name', { exact: true }).fill('New Pharmacy');
  await dialog.getByLabel('Address', { exact: true }).fill('Road 2');
  await dialog.getByRole('button', { name: 'Use map centre as entrance' }).click();
  await expect(dialog.getByText('✓ Locality: Dhanmondi')).toBeVisible();
  await dialog.getByRole('button', { name: 'Use this pharmacy' }).click();
  expect(saved).toHaveLength(0);
  await dialog.getByRole('button', { name: 'Next: review' }).click();
  await expect(dialog.getByText('2 linked pharmacies')).toBeVisible();
  await dialog.getByRole('button', { name: 'Save & publish' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Similar record exists');
  await dialog.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(dialog.getByRole('checkbox', { name: 'Existing Pharmacy Road 1' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(dialog.getByLabel('Medicine name', { exact: true })).toHaveValue('Test Medicine');
  await dialog.getByText('Bengali content & more details', { exact: true }).click();
  await dialog
    .getByLabel('Duplicate override reason (only if needed)', { exact: true })
    .fill('Reviewed different product');
  await dialog.getByRole('button', { name: 'Next: choose pharmacies' }).click();
  await dialog.getByRole('button', { name: 'Next: review' }).click();
  await dialog.getByRole('button', { name: 'Save & publish' }).click();
  await expect(dialog).not.toBeVisible();
  expect(saved).toHaveLength(2);
  expect(saved[1]).toMatchObject({
    medicine: {
      nameEn: 'Test Medicine',
      slug: 'test-medicine',
      overrideReason: 'Reviewed different product',
    },
    pharmacyIds: ['existing'],
    pharmacies: [{ nameEn: 'New Pharmacy', localityId: 'locality' }],
    publish: true,
  });
});

test('shared-boundary pharmacy requires locality selection and ignores stale checks', async ({
  page,
}) => {
  let releaseOld!: () => void;
  const old = new Promise<void>((resolve) => {
    releaseOld = resolve;
  });
  let checks = 0;
  await page.route('**/api/v1/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/pharmacy-entrance-areas')) {
      checks++;
      if (checks === 1) {
        await old;
        return route.fulfill({ json: { data: [{ id: 'stale', name_en: 'Stale area' }] } });
      }
      return route.fulfill({
        json: {
          data: [
            { id: 'a', name_en: 'Area A' },
            { id: 'b', name_en: 'Area B' },
          ],
        },
      });
    }
    return route.fulfill({
      json: { data: path.endsWith('/me') ? { permissions: ['*'] } : { items: [], total: 0 } },
    });
  });
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/pharmacies');
  await page.getByRole('button', { name: 'Add pharmacy', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Pharmacy name', { exact: true }).fill('Boundary Pharmacy');
  await dialog.getByLabel('Address', { exact: true }).fill('Shared road');
  await dialog.getByRole('button', { name: 'Use map centre as entrance' }).click();
  await expect(dialog.getByRole('button', { name: 'Use this pharmacy' })).toBeDisabled();
  await dialog.getByText('Enter entrance coordinates manually', { exact: true }).click();
  await dialog.getByLabel('Entrance longitude', { exact: true }).fill('90.45');
  const locality = dialog.getByRole('combobox');
  await expect(locality).toBeVisible();
  releaseOld();
  await expect(dialog.getByRole('button', { name: 'Use this pharmacy' })).toBeDisabled();
  await locality.selectOption('b');
  await dialog.getByRole('button', { name: 'Use this pharmacy' }).click();
  await expect(dialog.getByText('Ready to save?')).toBeVisible();
  await page.screenshot({ path: '../docs/screenshots/setup-pharmacy-mobile.png', fullPage: true });
});
