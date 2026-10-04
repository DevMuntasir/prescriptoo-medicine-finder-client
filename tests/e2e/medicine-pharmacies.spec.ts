import { test, expect } from '@playwright/test';

test('existing medicine adds pharmacies, reactivates links and safely retries partial saves', async ({
  page,
}) => {
  const links = [
    {
      id: 'linked',
      medicine_id: 'medicine',
      pharmacy_id: 'old',
      active: true,
      revision: 1,
      stock_status: null,
    },
    {
      id: 'inactive',
      medicine_id: 'medicine',
      pharmacy_id: 'returning',
      active: false,
      revision: 3,
      stock_status: 'low',
    },
  ];
  const writes: { method: string; body: Record<string, unknown> }[] = [];
  let fail = true;
  await page.route('**/api/v1/admin/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path.endsWith('/me')) return route.fulfill({ json: { data: { permissions: ['*'] } } });
    if (path.includes('/mappings') && request.method() !== 'GET') {
      const body = request.postDataJSON();
      writes.push({ method: request.method(), body });
      if (body.pharmacyId === 'returning' && fail) {
        fail = false;
        return route.fulfill({
          status: 409,
          json: { error: { code: 'REVISION_CONFLICT', message: 'Refresh mapping' } },
        });
      }
      const saved = {
        id: body.pharmacyId,
        medicine_id: body.medicineId,
        pharmacy_id: body.pharmacyId,
        active: true,
        revision: 4,
        stock_status: body.stockStatus,
      };
      const index = links.findIndex((m) => m.pharmacy_id === body.pharmacyId);
      if (index < 0) links.push(saved);
      else links[index] = saved;
      return route.fulfill({ json: { data: saved } });
    }
    if (path.endsWith('/mappings')) return route.fulfill({ json: { data: links } });
    if (path.endsWith('/pharmacies')) {
      // Ensure choices include later pages and exclude archived locations.
      const items =
        url.searchParams.get('offset') === '0'
          ? [{ id: 'old', name_en: 'Old Pharmacy', address_en: 'Road 1' }]
          : [
              { id: 'new', name_en: 'New Pharmacy', address_en: 'Road 2' },
              { id: 'returning', name_en: 'Returning Pharmacy', address_en: 'Road 3' },
              {
                id: 'archived',
                name_en: 'Archived Pharmacy',
                address_en: 'Road 4',
                archived_at: '2026-10-04',
              },
            ];
      return route.fulfill({ json: { data: { items, total: 4 } } });
    }
    return route.fulfill({
      json: {
        data: {
          items: [{ id: 'medicine', name_en: 'Existing Medicine', publication_state: 'published' }],
          total: 1,
        },
      },
    });
  });
  await page.goto('/admin/medicines');
  await page.getByRole('button', { name: 'Add pharmacies', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const old = dialog.getByRole('checkbox', { name: /Old Pharmacy/ });
  await expect(old).toBeChecked();
  await expect(old).toBeDisabled();
  await expect(dialog.getByText('Archived Pharmacy')).toHaveCount(0);
  await dialog.getByLabel('Find a pharmacy').fill('Road 2');
  await dialog.getByRole('checkbox', { name: /New Pharmacy/ }).check();
  await dialog.getByLabel('Find a pharmacy').fill('');
  await dialog.getByRole('checkbox', { name: /Returning Pharmacy/ }).check();
  await dialog.getByRole('button', { name: 'Add selected pharmacies (2)' }).click();
  await expect(dialog.getByRole('alert')).toContainText('1 pharmacy location(s) added');
  await expect(dialog.getByRole('checkbox', { name: /New Pharmacy/ })).toBeDisabled();
  await expect(dialog.getByRole('checkbox', { name: /Returning Pharmacy/ })).toBeChecked();
  await dialog.getByRole('button', { name: 'Add selected pharmacies (1)' }).click();
  await expect(dialog).not.toBeVisible();
  expect(writes.filter((w) => w.method === 'POST')).toEqual([
    {
      method: 'POST',
      body: { medicineId: 'medicine', pharmacyId: 'new', active: true, stockStatus: null },
    },
  ]);
  expect(writes.at(-1)).toEqual({
    method: 'PATCH',
    body: {
      medicineId: 'medicine',
      pharmacyId: 'returning',
      active: true,
      stockStatus: 'low',
      revision: 3,
    },
  });
  await page.getByRole('button', { name: 'Add pharmacies', exact: true }).click();
  await expect(dialog.getByRole('checkbox', { name: /New Pharmacy/ })).toBeDisabled();
  await expect(dialog.getByRole('checkbox', { name: /Returning Pharmacy/ })).toBeDisabled();
});

test('pharmacy action requires mapping write permission', async ({ page }) => {
  await page.route('**/api/v1/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({
      json: {
        data: path.endsWith('/me')
          ? {
              permissions: [
                'medicines.read',
                'medicines.write',
                'pharmacies.read',
                'mappings.read',
              ],
            }
          : { items: [{ id: 'medicine', name_en: 'Existing Medicine' }], total: 1 },
      },
    });
  });
  await page.goto('/admin/medicines');
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add pharmacies', exact: true })).toHaveCount(0);
});
