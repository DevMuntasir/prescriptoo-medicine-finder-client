import { test, expect } from '@playwright/test';

test('pharmacy entrance manual fallback and save payload when Google is unavailable', async ({ page }) => {
  let saved: Record<string, unknown> | undefined;
  await page.route('**/api/v1/admin/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/pharmacy-entrance-areas'))
      return route.fulfill({ json: { data: [{ id: 'test-locality', name_en: 'Test locality' }] } });
    if (route.request().method() === 'POST') {
      saved = route.request().postDataJSON();
      return route.fulfill({ json: { data: { id: 'test-pharmacy', ...saved } } });
    }
    const data = url.pathname.endsWith('/me')
      ? { permissions: ['*'], name: 'Test administrator' }
      : url.pathname.endsWith('/areas')
        ? [
            {
              id: 'test-locality',
              type: 'locality',
              name_en: 'Test locality',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [90.37, 23.77],
                    [90.39, 23.77],
                    [90.39, 23.79],
                    [90.37, 23.79],
                    [90.37, 23.77],
                  ],
                ],
              },
            },
          ]
        : { items: [], total: 0 };
    await route.fulfill({ json: { data } });
  });
  await page.route('https://maps.googleapis.com/maps/api/js**', (route) => route.abort());
  await page.goto('/admin/pharmacies');
  await page.getByRole('button', { name: 'Add pharmacy', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Use map centre as entrance' })).toBeDisabled();
  await dialog.getByLabel('Pharmacy name', { exact: true }).fill('Test pharmacy');
  await dialog.getByLabel('Address', { exact: true }).fill('Test entrance');
  await dialog.getByText('Enter entrance coordinates manually', { exact: true }).click();
  const lat = dialog.getByLabel('Entrance latitude', { exact: true });
  const lng = dialog.getByLabel('Entrance longitude', { exact: true });
  await lat.fill('23.78');
  await lng.fill('90.38');
  await dialog.getByRole('button', { name: 'Use this pharmacy', exact: true }).click();
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(saved?.location).toEqual({ latitude: 23.78, longitude: 90.38 });
  expect(saved?.localityId).toBe('test-locality');
  await page.getByRole('button', { name: 'Add pharmacy', exact: true }).click();
  await expect(dialog.getByText('No entrance selected yet.')).toBeVisible();
  await expect(dialog.locator('.entrance-pin')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Use map centre as entrance' })).toBeDisabled();
});
