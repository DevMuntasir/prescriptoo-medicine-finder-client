import { describe, it, expect } from 'vitest';
import { upsertRecord, isDuplicate } from '../src/features/admin/mutation';
import type { DemoRecord } from '../src/contracts';
describe('demo admin edits', () => {
  const rows: DemoRecord[] = [
    { id: '1', name: 'Green Pharmacy', detail: 'Sample', area: 'Dhanmondi', status: 'Active' },
  ];
  it('updates an existing record without adding duplicate rows or mutating source fixtures', () => {
    const next = upsertRecord(rows, { ...rows[0], name: 'Updated pharmacy' });
    expect(next).toHaveLength(1);
    expect(next[0].name).toBe('Updated pharmacy');
    expect(rows[0].name).toBe('Green Pharmacy');
  });
  it('requires duplicate review for a new identity and allows editing its own name', () => {
    expect(isDuplicate(rows, ' green pharmacy ', 'new')).toBe(true);
    expect(isDuplicate(rows, 'Green Pharmacy', '1')).toBe(false);
  });
});
