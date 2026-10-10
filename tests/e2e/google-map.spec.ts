import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://maps.googleapis.com/maps/api/js**', (route) => route.abort());
});

test('Google boundary fallback preserves longitude-first GeoJSON and commits', async ({ page }) => {
  const writes: string[] = [];
  await page.route('**/api/v1/admin/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'POST') {
      writes.push(path);
      return route.fulfill({
        json: {
          data: path.endsWith('/preview')
            ? { previewToken: 'test-preview', affected: [] }
            : { revision: 2 },
        },
      });
    }
    return route.fulfill({
      json: {
        data: path.endsWith('/me')
          ? { permissions: ['*'], name: 'Test administrator' }
          : [
              {
                id: 'area',
                name_en: 'Test area',
                type: 'locality',
                revision: 1,
                geometry: {
                  type: 'Polygon',
                  coordinates: [
                    [
                      [90.37, 23.77],
                      [90.39, 23.77],
                      [90.39, 23.79],
                      [90.37, 23.77],
                    ],
                  ],
                },
              },
            ],
      },
    });
  });
  await page.goto('/admin/areas');
  await page.getByRole('button', { name: 'Edit boundary' }).click();
  const modal = page.getByRole('dialog');
  await modal.getByText('Advanced: import boundary', { exact: true }).click();
  const field = modal.getByLabel('Boundary GeoJSON');
  const geometry = JSON.parse(await field.inputValue());
  expect(geometry.coordinates[0][0]).toEqual([90.37, 23.77]);
  await modal.getByRole('button', { name: 'Save boundary', exact: true }).click();
  await expect(modal).not.toBeVisible();
  expect(writes).toEqual([
    '/api/v1/admin/areas/area/preview',
    '/api/v1/admin/areas/area/commit',
  ]);
});

test('new area can be imported and saved while Google is unavailable', async ({ page }) => {
  let saved: Record<string, any> | undefined;
  await page.route('**/api/v1/admin/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'POST') {
      saved = route.request().postDataJSON();
      return route.fulfill({ json: { data: { id: 'new-area', ...saved } } });
    }
    return route.fulfill({
      json: { data: path.endsWith('/me') ? { permissions: ['*'] } : [] },
    });
  });
  await page.goto('/admin/areas');
  await page.getByRole('button', { name: /^Add/ }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Area name').fill('Dhanmondi');
  await modal.getByText('Advanced: import boundary', { exact: true }).click();
  await modal.getByLabel('Boundary GeoJSON').fill(
    JSON.stringify({
      type: 'Polygon',
      coordinates: [
        [
          [90.37, 23.77],
          [90.39, 23.77],
          [90.39, 23.79],
          [90.37, 23.77],
        ],
      ],
    }),
  );
  await modal.getByRole('button', { name: 'Save area', exact: true }).click();
  await expect(modal).not.toBeVisible();
  expect(saved?.geometry.coordinates[0][0]).toEqual([90.37, 23.77]);
});
