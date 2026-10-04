import type * as Leaflet from 'leaflet';

// Browser caching and origin-only referrers keep OSM attribution/usage intact
// without sending the patient's page path or coordinates as a referrer.
export function addTiles(L: typeof Leaflet, map: Leaflet.Map, onError: () => void) {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    referrerPolicy: 'strict-origin-when-cross-origin',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  })
    .on('tileerror', onError)
    .addTo(map);
}
