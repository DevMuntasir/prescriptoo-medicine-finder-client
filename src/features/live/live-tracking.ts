import type { Origin } from '@/lib/api';

export const MAX_TRACKING_ACCURACY_METERS = 100;
export const ARRIVAL_RADIUS_METERS = 25;
export const REROUTE_DISTANCE_METERS = 25;
export const IMMEDIATE_REROUTE_DISTANCE_METERS = 80;
export const REROUTE_INTERVAL_MS = 10_000;

type Point = Pick<Origin, 'latitude' | 'longitude'>;

export function distanceMeters(from: Point, to: Point) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const halfLatitude = Math.sin(latitudeDelta / 2);
  const halfLongitude = Math.sin(longitudeDelta / 2);
  const a =
    halfLatitude * halfLatitude +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * halfLongitude * halfLongitude;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function shouldRefreshRoute({
  current,
  routedFrom,
  lastRefreshAt,
  now,
}: {
  current: Point;
  routedFrom?: Point;
  lastRefreshAt: number;
  now: number;
}) {
  if (!routedFrom) return true;
  const moved = distanceMeters(routedFrom, current);
  return (
    moved >= IMMEDIATE_REROUTE_DISTANCE_METERS ||
    (moved >= REROUTE_DISTANCE_METERS && now - lastRefreshAt >= REROUTE_INTERVAL_MS)
  );
}
