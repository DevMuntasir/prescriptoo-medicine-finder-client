'use client';

import { useEffect, useRef, useState } from 'react';
import type { GeoJsonObject } from 'geojson';
import type * as Leaflet from 'leaflet';
import { addTiles } from './tiles';

type Point = { latitude: number; longitude: number };

export function EntrancePicker({ latitude, longitude, geometry, onPick }: {
  latitude: unknown;
  longitude: unknown;
  geometry?: unknown;
  onPick: (point: Point) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onPick);
  const marker = useRef<Leaflet.Marker | null>(null);
  const [ready, setReady] = useState<{ L: typeof Leaflet; map: Leaflet.Map }>();
  const [error, setError] = useState('');
  useEffect(() => { callback.current = onPick; }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | undefined;
    let observer: ResizeObserver | undefined;
    void import('leaflet').then((L) => {
      if (cancelled || !container.current) return;
      map = L.map(container.current, { scrollWheelZoom: false }).setView([23.7, 90.35], 7);
      addTiles(L, map, () => {
        if (!cancelled) setError('Map tiles could not load. Check your connection or enter coordinates below.');
      });
      map.on('click', (event: Leaflet.LeafletMouseEvent) => {
        const p = event.latlng.wrap();
        callback.current({ latitude: p.lat, longitude: p.lng });
      });
      observer = new ResizeObserver(() => map?.invalidateSize());
      observer.observe(container.current);
      setReady({ L, map });
    }).catch(() => {
      if (!cancelled) setError('Map could not load. Reload the page or enter coordinates below.');
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      map?.remove();
      marker.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !geometry) return;
    const layer = ready.L.geoJSON(geometry as GeoJsonObject, {
      style: { color: '#14796c', weight: 2, fillOpacity: 0.06 },
      interactive: false,
    }).addTo(ready.map);
    const bounds = layer.getBounds();
    if (bounds.isValid()) ready.map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
    return () => { layer.remove(); };
  }, [ready, geometry]);

  useEffect(() => {
    if (!ready) return;
    const lat = Number(latitude), lng = Number(longitude);
    if (latitude === '' || longitude === '' || latitude == null || longitude == null ||
        !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      marker.current = ready.L.marker([lat, lng], {
        draggable: true,
        title: 'Pharmacy entrance — drag to adjust',
        alt: 'Selected pharmacy entrance',
        icon: ready.L.divIcon({
          className: 'entrance-pin',
          html: '<span></span>',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(ready.map);
      marker.current.on('dragend', () => {
        const p = marker.current!.getLatLng().wrap();
        callback.current({ latitude: p.lat, longitude: p.lng });
      });
      ready.map.setView([lat, lng], Math.max(ready.map.getZoom(), 17));
    } else {
      marker.current.setLatLng([lat, lng]);
      if (!ready.map.getBounds().contains([lat, lng])) ready.map.panTo([lat, lng]);
    }
  }, [ready, latitude, longitude]);

  return (
    <section className="entrance-picker" aria-label="Pharmacy entrance picker">
      <strong>Pick the pharmacy entrance</strong>
      <p>Zoom in and click or tap the exact shop entrance. Drag the pin to adjust it.</p>
      <div ref={container} className="entrance-map" aria-label="Entrance map: use arrow keys to pan and plus or minus to zoom" />
      <button type="button" className="button secondary" disabled={!ready} onClick={() => {
        if (!ready) return;
        const p = ready.map.getCenter().wrap();
        callback.current({ latitude: p.lat, longitude: p.lng });
      }}>Use map centre as entrance</button>
      <p aria-live="polite">{latitude !== '' && longitude !== '' && latitude != null && longitude != null
        ? 'Entrance selected. Coordinates below update automatically.'
        : 'No entrance selected yet.'}</p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
