type Entry<T> = { value: T; expiresAt: number };

const results = new Map<string, Entry<unknown>>();
const flights = new Map<string, Promise<unknown>>();
const TTL_MS = 60_000;
const MAX_ENTRIES = 50;

// This cache is tab-memory only: precise origins never enter URLs, logs or persistent storage.
export async function cachedLocatorSearch<T>(key: string, request: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = results.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > now) {
    results.delete(key);
    results.set(key, hit);
    return hit.value;
  }
  if (hit) results.delete(key);
  const pending = flights.get(key) as Promise<T> | undefined;
  if (pending) return pending;
  const flight = request();
  flights.set(key, flight);
  try {
    const value = await flight;
    results.set(key, { value, expiresAt: now + TTL_MS });
    while (results.size > MAX_ENTRIES) {
      const oldest = results.keys().next().value as string | undefined;
      if (!oldest) break;
      results.delete(oldest);
    }
    return value;
  } finally {
    flights.delete(key);
  }
}
