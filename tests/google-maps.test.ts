import { describe, expect, it } from 'vitest';
import { decodePolyline } from '../src/lib/google-maps';
import { cachedLocatorSearch } from '../src/features/live/locator-cache';
import {
  ARRIVAL_RADIUS_METERS,
  distanceMeters,
  shouldRefreshRoute,
} from '../src/features/live/live-tracking';

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

  it('refreshes a live route after meaningful movement without refreshing for GPS jitter', () => {
    const routedFrom = { latitude: 23.78, longitude: 90.38 };
    expect(
      shouldRefreshRoute({
        routedFrom,
        current: { latitude: 23.78003, longitude: 90.38 },
        lastRefreshAt: 1_000,
        now: 20_000,
      }),
    ).toBe(false);
    expect(
      shouldRefreshRoute({
        routedFrom,
        current: { latitude: 23.7803, longitude: 90.38 },
        lastRefreshAt: 1_000,
        now: 20_000,
      }),
    ).toBe(true);
  });

  it('uses a conservative exact-entrance arrival radius', () => {
    expect(ARRIVAL_RADIUS_METERS).toBe(25);
    expect(
      distanceMeters(
        { latitude: 23.78, longitude: 90.38 },
        { latitude: 23.7801, longitude: 90.38 },
      ),
    ).toBeLessThan(ARRIVAL_RADIUS_METERS);
  });
});
