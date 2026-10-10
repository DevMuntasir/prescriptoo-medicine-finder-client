'use client';

import { useEffect, useRef, useState } from 'react';
import {
  googleMapsAuthenticationFailed,
  googleMapId,
  loadGoogleMaps,
  onGoogleMapsAuthenticationFailure,
  toLatLngLiteral,
} from '@/lib/google-maps';

type Point = { latitude: number; longitude: number };
type ReadyMap = {
  map: google.maps.Map;
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
};

export function EntrancePicker({
  latitude,
  longitude,
  geometry,
  onPick,
}: {
  latitude: unknown;
  longitude: unknown;
  geometry?: unknown;
  onPick: (point: Point) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onPick);
  const marker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const dragListener = useRef<google.maps.MapsEventListener | null>(null);
  const [ready, setReady] = useState<ReadyMap>();
  const [error, setError] = useState('');
  useEffect(() => {
    callback.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let active = true;
    let click: google.maps.MapsEventListener | undefined;
    const stopListeningForAuthenticationFailure = onGoogleMapsAuthenticationFailure((cause) => {
      if (!active) return;
      setReady(undefined);
      setError(cause.message + ' Enter coordinates below.');
    });
    void loadGoogleMaps('en')
      .then(async () => {
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          google.maps.importLibrary('maps') as Promise<google.maps.MapsLibrary>,
          google.maps.importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
        ]);
        if (!active || googleMapsAuthenticationFailed() || !container.current) return;
        const map = new Map(container.current, {
          center: { lat: 23.7, lng: 90.35 },
          zoom: 7,
          mapId: googleMapId(),
          clickableIcons: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          gestureHandling: 'cooperative',
        });
        click = map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng)
            callback.current({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
        });
        setReady({ map, AdvancedMarkerElement });
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message + ' Enter coordinates below.');
      });
    return () => {
      active = false;
      click?.remove();
      stopListeningForAuthenticationFailure();
      dragListener.current?.remove();
      if (marker.current) marker.current.map = null;
      marker.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !geometry) return;
    const features = ready.map.data.addGeoJson({
      type: 'Feature',
      properties: {},
      geometry,
    });
    ready.map.data.setStyle({ strokeColor: '#14796c', strokeWeight: 2, fillOpacity: 0.06 });
    const bounds = new google.maps.LatLngBounds();
    features.forEach((feature) =>
      feature.getGeometry()?.forEachLatLng((point) => bounds.extend(point)),
    );
    if (!bounds.isEmpty()) ready.map.fitBounds(bounds, 24);
    return () => features.forEach((feature) => ready.map.data.remove(feature));
  }, [ready, geometry]);

  useEffect(() => {
    if (!ready) return;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (
      latitude === '' ||
      longitude === '' ||
      latitude == null ||
      longitude == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      if (marker.current) marker.current.map = null;
      marker.current = null;
      return;
    }
    const position = { lat, lng };
    if (!marker.current) {
      const pin = document.createElement('div');
      pin.className = 'entrance-pin';
      pin.innerHTML = '<span></span>';
      marker.current = new ready.AdvancedMarkerElement({
        map: ready.map,
        position,
        title: 'Pharmacy entrance — drag to adjust',
        content: pin,
        gmpDraggable: true,
      });
      dragListener.current = marker.current.addListener('dragend', () => {
        const point = marker.current?.position;
        if (!point) return;
        const value = toLatLngLiteral(point);
        callback.current({ latitude: value.lat, longitude: value.lng });
      });
      ready.map.setCenter(position);
      ready.map.setZoom(Math.max(ready.map.getZoom() ?? 7, 17));
    } else {
      marker.current.position = position;
      if (!ready.map.getBounds()?.contains(position)) ready.map.panTo(position);
    }
  }, [ready, latitude, longitude]);

  return (
    <section className="entrance-picker" aria-label="Pharmacy entrance picker">
      <strong>Pick the pharmacy entrance</strong>
      <p>Zoom in and click or tap the exact shop entrance. Drag the pin to adjust it.</p>
      <div ref={container} className="entrance-map" aria-label="Google entrance map" />
      <button
        type="button"
        className="button secondary"
        disabled={!ready}
        onClick={() => {
          const point = ready?.map.getCenter();
          if (point) callback.current({ latitude: point.lat(), longitude: point.lng() });
        }}
      >
        Use map centre as entrance
      </button>
      <p aria-live="polite">
        {latitude !== '' && longitude !== '' && latitude != null && longitude != null
          ? 'Entrance selected. Coordinates below update automatically.'
          : 'No entrance selected yet.'}
      </p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
