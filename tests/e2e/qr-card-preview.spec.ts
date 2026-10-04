import { test, expect } from '@playwright/test';

test('new QR opens its actual card PDF and failed previews can be retried', async ({ page }) => {
  let created = false;
  let printAttempts = 0;
  const qr = { id: 'qr-created', name_en: 'Test medicine', token: 'test-token', active: true };
  await page.route('**/api/v1/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith('/me')) data = { permissions: ['*'] };
    else if (path.endsWith('/qrs/print')) {
      expect(route.request().postDataJSON()).toEqual({ qrIds: [qr.id], format: 'card' });
      printAttempts++;
      data = { id: 'job', status: 'queued' };
    } else if (path.endsWith('/jobs/job')) {
      data =
        printAttempts === 1
          ? { id: 'job', status: 'failed' }
          : { id: 'job', status: 'complete', file_id: 'actual-card' };
    } else if (path.endsWith('/files/actual-card')) {
      return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' });
    } else if (path.endsWith('/qrs')) {
      if (route.request().method() === 'POST') {
        created = true;
        data = qr;
      } else data = created ? [qr] : [];
    } else if (path.endsWith('/medicines')) data = [{ id: 'medicine', name_en: 'Test medicine' }];
    return route.fulfill({ json: { data } });
  });
  await page.goto('/admin/qrs');
  await page.getByRole('button', { name: 'Add QR card', exact: true }).click();
  await page.getByRole('combobox', { name: 'Medicine', exact: true }).selectOption('medicine');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'QR card preview' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('alert')).toContainText('Card generation failed');
  await dialog.getByRole('button', { name: 'Retry preview' }).click();
  await expect(dialog.getByTitle('Actual QR card')).toHaveAttribute('src', /^blob:/);
  await expect(dialog.getByRole('link', { name: 'Download card PDF' })).toHaveAttribute(
    'download',
    `qr-card-${qr.id}.pdf`,
  );
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Preview / print card' }).click();
  await expect(dialog.getByTitle('Actual QR card')).toHaveAttribute('src', /^blob:/);
});
