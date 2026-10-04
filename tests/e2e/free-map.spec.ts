import { test, expect } from '@playwright/test';

test('Leaflet boundary edits preserve longitude order without Google or tile availability', async ({ page }) => {
  const googleRequests: string[] = [];
  page.on('request', request => {
    if (/maps\.googleapis|maps\.gstatic/.test(request.url())) googleRequests.push(request.url());
  });
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.route('**/api/v1/admin/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: { data: path.endsWith('/me')
      ? { permissions: ['*'], name: 'Test administrator' }
      : [{ id: 'test-area', name_en: 'Test area', type: 'locality', revision: 1,
          geometry: { type: 'Polygon', coordinates: [[[90.37,23.77],[90.39,23.77],[90.39,23.79],[90.37,23.77]]] } }] } });
  });
  await page.goto('/admin/areas');
  await page.getByRole('button', { name: 'Edit boundary' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.locator('.leaflet-container')).toBeVisible();
  await expect(modal.getByRole('link', { name: 'OpenStreetMap', exact: true })).toBeVisible();
  await expect(modal.locator('.entrance-pin')).toHaveCount(3);
  await modal.getByText('Advanced: import boundary', { exact: true }).click();
  const json = modal.getByLabel('Boundary GeoJSON');
  const before = await json.inputValue();
  const marker = modal.locator('.entrance-pin').first();
  await marker.scrollIntoViewIfNeeded();
  const box = (await marker.boundingBox())!;
  await page.mouse.move(box.x + 12, box.y + 12);
  await page.mouse.down();
  await page.mouse.move(box.x + 32, box.y + 22, { steps: 10 });
  await page.mouse.up();
  await expect(json).not.toHaveValue(before);
  const ring = JSON.parse(await json.inputValue()).coordinates[0];
  expect(ring[0][0]).toBeGreaterThan(90);
  expect(ring[0][1]).toBeLessThan(24);
  expect(ring.at(-1)).toEqual(ring[0]);
  await modal.getByRole('button', { name: 'Draw / add vertices' }).click();
  await modal.locator('.leaflet-container').click({ position: { x: 180, y: 140 } });
  expect(JSON.parse(await json.inputValue()).coordinates[0]).toHaveLength(5);
  expect(googleRequests).toEqual([]);
});


test('area setup needs only a name, map boundary and one save', async ({ page }) => {
  let saved: Record<string, any> | undefined;
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.route('**/api/v1/admin/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'POST') {
      saved = route.request().postDataJSON();
      return route.fulfill({ json: { data: { id: 'new-area', ...saved } } });
    }
    return route.fulfill({ json: { data: path.endsWith('/me') ? { permissions: ['*'] } : [] } });
  });
  await page.goto('/admin/areas');
  await page.getByRole('button', { name: /^Add/ }).click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Area name').fill('Dhanmondi');
  await expect(modal.getByLabel('Area type')).toHaveCount(0);
  await expect(modal.getByLabel('Parent area')).toHaveCount(0);
  await expect(modal.getByLabel('Boundary GeoJSON')).not.toBeVisible();
  const map = modal.locator('.leaflet-container');
  await expect(map).toBeVisible();
  await map.click({ position: { x: 150, y: 100 } });
  await map.click({ position: { x: 250, y: 100 } });
  await map.click({ position: { x: 250, y: 160 } });
  await modal.getByRole('button', { name: 'Save area', exact: true }).click();
  await expect(modal).not.toBeVisible();
  expect(saved?.nameEn).toBe('Dhanmondi');
  expect(saved?.geometry.type).toBe('Polygon');
  expect(saved?.geometry.coordinates[0]).toHaveLength(4);
  expect(saved).not.toHaveProperty('parentId');
  expect(saved).not.toHaveProperty('type');
});

test('saving an unaffected boundary previews and commits with one click', async ({ page }) => {
  const writes: string[] = [];
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.route('**/api/v1/admin/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'POST') {
      writes.push(path);
      return route.fulfill({ json: { data: path.endsWith('/preview') ? { previewToken: 'test-preview', affected: [] } : { revision: 2 } } });
    }
    return route.fulfill({ json: { data: path.endsWith('/me') ? { permissions: ['*'] } : [{ id: 'area', name_en: 'Old division', type: 'division', revision: 1, geometry: { type: 'Polygon', coordinates: [[[90.37,23.77],[90.39,23.77],[90.39,23.79],[90.37,23.77]]] } }] } });
  });
  await page.goto('/admin/areas');
  await page.getByRole('button', { name: 'Edit boundary' }).click();
  const modal = page.getByRole('dialog');
  await modal.getByRole('button', { name: 'Save boundary', exact: true }).click();
  await expect(modal).not.toBeVisible();
  expect(writes).toEqual(['/api/v1/admin/areas/area/preview', '/api/v1/admin/areas/area/commit']);
});
