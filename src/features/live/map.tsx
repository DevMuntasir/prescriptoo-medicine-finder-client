'use client';
import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { LivePharmacy, Origin, LiveRoute } from '@/lib/api';
import { addTiles } from './tiles';

export function ShopMap({
  origin,
  points,
  selected,
  onSelect,
  onPick,
}: {
  origin?: Pick<Origin, 'latitude' | 'longitude'>;
  points: LivePharmacy[];
  selected?: string;
  route?: LiveRoute;
  onSelect: (id: string) => void;
  onPick?: (p: Pick<Origin, 'latitude' | 'longitude'>) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState<{ L: typeof Leaflet; map: Leaflet.Map }>();
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(14);
  useEffect(() => {
    let active = true;
    let map: Leaflet.Map | undefined;
    let observer: ResizeObserver | undefined;
    void import('leaflet')
      .then((L) => {
        if (!active || !element.current) return;
        map = L.map(element.current, { scrollWheelZoom: false }).setView([23.78, 90.4], 14);
        addTiles(L, map, () => {
          if (active)
            setError(
              'Map tiles could not load. Use the shop list below. / নিচের দোকানের তালিকা ব্যবহার করুন।',
            );
        });
        map.on('zoomend', () => setZoom(map!.getZoom()));
        observer = new ResizeObserver(() => map?.invalidateSize());
        observer.observe(element.current);
        setReady({ L, map });
      })
      .catch(() => {
        if (active) setError('Map could not load. Use the shop list below.');
      });
    return () => {
      active = false;
      observer?.disconnect();
      map?.remove();
    };
  }, []);
  useEffect(() => {
    if (!ready || !onPick) return;
    const pick = (e: Leaflet.LeafletMouseEvent) => {
      const p = e.latlng.wrap();
      onPick({ latitude: p.lat, longitude: p.lng });
    };
    ready.map.on('click', pick);
    return () => {
      ready.map.off('click', pick);
    };
  }, [ready, onPick]);
  useEffect(() => {
    if (!ready) return;
    const positions: Leaflet.LatLngTuple[] = points.map((p) => [p.latitude, p.longitude]);
    if (origin) positions.push([origin.latitude, origin.longitude]);
    if (positions.length) ready.map.fitBounds(positions, { padding: [40, 40], maxZoom: 16 });
  }, [ready, origin, points]);
  useEffect(() => {
    if (!ready) return;
    const { L, map } = ready;
    const layers = L.layerGroup().addTo(map);
    const make = (
      lat: number,
      lng: number,
      label: string,
      title: string,
      active: boolean,
      click?: () => void,
    ) => {
      const node = document.createElement('span');
      node.className = `live-map-pin ${active ? 'selected' : ''}`;
      node.textContent = label;
      const marker = L.marker([lat, lng], {
        title,
        alt: title,
        bubblingMouseEvents: false,
        icon: L.divIcon({
          html: node,
          className: 'shop-map-marker',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        }),
      }).addTo(layers);
      marker.on('add', () => marker.getElement()?.setAttribute('aria-label', title));
      marker.getElement()?.setAttribute('aria-label', title);
      if (click) marker.on('click', click);
    };
    if (origin) make(origin.latitude, origin.longitude, '●', 'Your starting point', false);
    const groups = new Map<string, LivePharmacy[]>();
    const cell = 180 / Math.pow(2, zoom + 2);
    for (const p of points) {
      const key =
        p.id === selected
          ? p.id
          : `${Math.floor(p.latitude / cell)},${Math.floor(p.longitude / cell)}`;
      groups.set(key, [...(groups.get(key) || []), p]);
    }
    for (const group of groups.values()) {
      const p = group[0];
      make(
        p.latitude,
        p.longitude,
        group.length > 1 ? String(group.length) : '+',
        group.length > 1 ? `${group.length} pharmacies; zoom in` : p.name_en,
        p.id === selected,
        () => {
          if (group.length > 1) map.setView([p.latitude, p.longitude], Math.min(19, zoom + 2));
          else onSelect(p.id);
        },
      );
    }
    // Google route geometry must not be drawn on an OpenStreetMap basemap.
    return () => {
      layers.remove();
    };
  }, [ready, points, selected, origin, onSelect, zoom]);
  return (
    <div className="live-map">
      <div ref={element} className="live-map-canvas" aria-label="Pharmacy map" />
      {error && (
        <div className="live-map-fallback" role="status">
          <strong>Map unavailable / মানচিত্র অনুপলব্ধ</strong>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
