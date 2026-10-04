import { DemoRecord } from '@/contracts';
export function upsertRecord(records: DemoRecord[], record: DemoRecord): DemoRecord[] {
  return records.some((r) => r.id === record.id)
    ? records.map((r) => (r.id === record.id ? record : r))
    : [...records, record];
}
export function isDuplicate(records: { id: string; name: string }[], name: string, id: string) {
  return records.some(
    (r) => r.id !== id && r.name.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
  );
}

// Called only from a user-initiated save, never during rendering.
export function createDemoId() {
  return `demo-${crypto.randomUUID()}`;
}
