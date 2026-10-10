'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { LivePharmacy, Origin, LiveRoute } from '@/lib/api';
import {
  decodePolyline,
  googleMapsAuthenticationFailed,
  googleMapId,
  loadGoogleMaps,
  onGoogleMapsAuthenticationFailure,
} from '@/lib/google-maps';

type ReadyMap = {
  map: google.maps.Map;
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
};

function markerContent(label: string, selected: boolean) {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = `live-map-pin ${selected ? 'selected' : ''}`;
  node.textContent = label;
  return node;
}

export function ShopMap({
  origin,
  points,
  selected,
  route,
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
  const locale = useLocale();
  const element = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState<ReadyMap>();
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(14);

  useEffect(() => {
    let active = true;
    let listener: google.maps.MapsEventListener | undefined;
    const stopListeningForAuthenticationFailure = onGoogleMapsAuthenticationFailure((cause) => {
      if (!active) return;
      setReady(undefined);
      setError(cause.message);
    });
    void loadGoogleMaps(locale)
      .then(async () => {
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          google.maps.importLibrary('maps') as Promise<google.maps.MapsLibrary>,
          google.maps.importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
        ]);
        if (!active || googleMapsAuthenticationFailed() || !element.current) return;
        const map = new Map(element.current, {
          center: { lat: 23.78, lng: 90.4 },
          zoom: 14,
          mapId: googleMapId(),
          clickableIcons: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          gestureHandling: 'cooperative',
        });
        listener = map.addListener('zoom_changed', () => setZoom(map.getZoom() ?? 14));
        setReady({ map, AdvancedMarkerElement });
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
      listener?.remove();
      stopListeningForAuthenticationFailure();
    };
  }, [locale]);

  useEffect(() => {
    if (!ready || !onPick) return;
    const listener = ready.map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) onPick({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
    });
    return () => listener.remove();
  }, [ready, onPick]);

  useEffect(() => {
    if (!ready) return;
    const bounds = new google.maps.LatLngBounds();
    for (const point of points) bounds.extend({ lat: point.latitude, lng: point.longitude });
    if (origin) bounds.extend({ lat: origin.latitude, lng: origin.longitude });
    if (!bounds.isEmpty()) {
      ready.map.fitBounds(bounds, 40);
      google.maps.event.addListenerOnce(ready.map, 'idle', () => {
        if ((ready.map.getZoom() ?? 0) > 16) ready.map.setZoom(16);
      });
    }
  }, [ready, origin, points]);

  useEffect(() => {
    if (!ready) return;
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    const removeListeners: Array<() => void> = [];
    const add = (
      position: google.maps.LatLngLiteral,
      label: string,
      title: string,
      active: boolean,
      click?: () => void,
    ) => {
      const content = markerContent(label, active);
      content.setAttribute('aria-label', title);
      const marker = new ready.AdvancedMarkerElement({
        map: ready.map,
        position,
        title,
        content,
        zIndex: active ? 20 : 10,
        gmpClickable: Boolean(click),
      });
      if (click) {
        const listener = () => click();
        marker.addEventListener('gmp-click', listener);
        removeListeners.push(() => marker.removeEventListener('gmp-click', listener));
      }
      markers.push(marker);
    };
    if (origin)
      add(
        { lat: origin.latitude, lng: origin.longitude },
        '●',
        locale === 'bn' ? 'আপনার শুরুর স্থান' : 'Your starting point',
        false,
      );
    const groups = new Map<string, LivePharmacy[]>();
    const cell = 180 / Math.pow(2, zoom + 2);
    for (const point of points) {
      const key =
        point.id === selected
          ? point.id
          : `${Math.floor(point.latitude / cell)},${Math.floor(point.longitude / cell)}`;
      groups.set(key, [...(groups.get(key) || []), point]);
    }
    for (const group of groups.values()) {
      const point = group[0]!;
      add(
        { lat: point.latitude, lng: point.longitude },
        group.length > 1 ? String(group.length) : '+',
        group.length > 1 ? `${group.length} pharmacies; zoom in` : point.name_en,
        point.id === selected,
        () => {
          if (group.length > 1) {
            ready.map.panTo({ lat: point.latitude, lng: point.longitude });
            ready.map.setZoom(Math.min(19, zoom + 2));
          } else onSelect(point.id);
        },
      );
    }
    return () => {
      removeListeners.forEach((remove) => remove());
      markers.forEach((marker) => (marker.map = null));
    };
  }, [ready, points, selected, origin, onSelect, zoom, locale]);

  useEffect(() => {
    if (!ready || !route?.polyline) return;
    const path = decodePolyline(route.polyline);
    const line = new google.maps.Polyline({
      map: ready.map,
      path,
      strokeColor: '#14796c',
      strokeOpacity: 0.95,
      strokeWeight: 6,
    });
    const bounds = new google.maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    if (!bounds.isEmpty()) ready.map.fitBounds(bounds, 48);
    return () => line.setMap(null);
  }, [ready, route]);

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
