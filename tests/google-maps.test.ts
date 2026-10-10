import { describe, expect, it } from 'vitest';
import { decodePolyline } from '../src/lib/google-maps';
import { cachedLocatorSearch } from '../src/features/live/locator-cache';

describe('Google map utilities', () => {
  it('decodes a Routes API overview polyline without another library', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
  });

  it('deduplicates concurrent and recent identical shop searches', async () => {
    let calls = 0;
    let release!: (value: { items: string[] }) => void;
    const request = () => {
      calls++;
      return new Promise<{ items: string[] }>((resolve) => (release = resolve));
    };
    const first = cachedLocatorSearch('same-private-origin', request);
    const second = cachedLocatorSearch('same-private-origin', request);
    expect(calls).toBe(1);
    release({ items: ['shop-1'] });
    await expect(first).resolves.toEqual({ items: ['shop-1'] });
    await expect(second).resolves.toEqual({ items: ['shop-1'] });
    await expect(cachedLocatorSearch('same-private-origin', request)).resolves.toEqual({
      items: ['shop-1'],
    });
    expect(calls).toBe(1);
  });
});
