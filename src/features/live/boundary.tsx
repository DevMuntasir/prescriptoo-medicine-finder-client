'use client';
import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/primitives';
import { api, json } from '@/lib/api';
import {
  googleMapsAuthenticationFailed,
  googleMapId,
  loadGoogleMaps,
  onGoogleMapsAuthenticationFailure,
  toLatLngLiteral,
} from '@/lib/google-maps';
type Row = Record<string, unknown>;
type Geometry = { type: 'Polygon'; coordinates: number[][][] };
const ring = (g: Geometry) => g.coordinates[0]?.slice(0, -1) || [];
export function BoundaryWorkbench({ area, onClose }: { area: Row; onClose: () => void }) {
  const creating = !area.id;
  const [name, setName] = useState('');
  const existing = area.geometry as {
    type: string;
    coordinates: number[][][] | number[][][][];
  } | null;
  const initial: Geometry = existing
    ? {
        type: 'Polygon',
        coordinates: (existing.type === 'MultiPolygon'
          ? existing.coordinates[0]
          : existing.coordinates) as number[][][],
      }
    : { type: 'Polygon', coordinates: [[]] };
  const [draft, setDraft] = useState(JSON.stringify(initial, null, 2)),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<{
      previewToken: string;
      affected: { kind: string; id: string; revision: number }[];
    }>(),
    [localities, setLocalities] = useState<Row[]>([]),
    [assignments, setAssignments] = useState<Record<string, string>>({});
  const container = useRef<HTMLDivElement>(null),
    [ready, setReady] = useState<{
      map: google.maps.Map;
      AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
    }>(),
    fitted = useRef(false),
    [drawing, setDrawing] = useState(!area.geometry);
  useEffect(() => {
    let active = true;
    const stopListeningForAuthenticationFailure = onGoogleMapsAuthenticationFailure((cause) => {
      if (!active) return;
      setReady(undefined);
      setError(cause.message + ' Edit GeoJSON below.');
    });
    api<Row[]>('admin/areas')
      .then((rows) => {
        if (active) setLocalities(rows.filter((r) => r.geometry && r.id !== area.id));
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    void loadGoogleMaps('en')
      .then(async () => {
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          google.maps.importLibrary('maps') as Promise<google.maps.MapsLibrary>,
          google.maps.importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
        ]);
        if (!active || googleMapsAuthenticationFailed() || !container.current) return;
        const map = new Map(container.current, {
          center: { lat: 23.78, lng: 90.4 },
          zoom: 14,
          mapId: googleMapId(),
          clickableIcons: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          gestureHandling: 'cooperative',
        });
        setReady({ map, AdvancedMarkerElement });
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message + ' Edit GeoJSON below.');
      });
    return () => {
      active = false;
      stopListeningForAuthenticationFailure();
      fitted.current = false;
    };
  }, [area.id]);
  useEffect(() => {
    if (!ready) return;
    let g: Geometry;
    try {
      g = JSON.parse(draft);
      if (g.type !== 'Polygon' || !Array.isArray(g.coordinates)) return;
    } catch {
      return;
    }
    const { map, AdvancedMarkerElement } = ready;
    const valid = (p: number[]) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
    if (!g.coordinates.every((r) => Array.isArray(r) && r.every(valid))) return;
    const vertices = ring(g);
    const shape = vertices.length
      ? new google.maps.Polygon({
          map,
          paths: g.coordinates.map((r) => r.map((p) => ({ lat: p[1]!, lng: p[0]! }))),
          strokeColor: '#14796c',
          strokeWeight: 2,
          fillOpacity: 0.2,
          clickable: false,
        })
      : undefined;
    const bounds = new google.maps.LatLngBounds();
    vertices.forEach((point) => bounds.extend({ lat: point[1]!, lng: point[0]! }));
    if (!fitted.current && !bounds.isEmpty()) {
      map.fitBounds(bounds, 24);
      google.maps.event.addListenerOnce(map, 'idle', () => {
        if ((map.getZoom() ?? 0) > 16) map.setZoom(16);
      });
      fitted.current = true;
    }
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    const listeners: google.maps.MapsEventListener[] = [];
    if (!drawing)
      vertices.forEach((p, index) => {
        const pin = document.createElement('div');
        pin.className = 'entrance-pin';
        pin.innerHTML = '<span></span>';
        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: p[1]!, lng: p[0]! },
          gmpDraggable: !busy,
          title: `Boundary vertex ${index + 1}`,
          content: pin,
        });
        markers.push(marker);
        listeners.push(
          marker.addListener('dragend', () => {
            if (!marker.position) return;
            const point = toLatLngLiteral(marker.position);
            const next = vertices.map((value, i) =>
              i === index ? [point.lng, point.lat] : value,
            );
            if (next.length) next.push(next[0]);
            setPreview(undefined);
            setDraft(
              JSON.stringify(
                { type: 'Polygon', coordinates: [next, ...g.coordinates.slice(1)] },
                null,
                2,
              ),
            );
          }),
        );
      });
    return () => {
      shape?.setMap(null);
      listeners.forEach((listener) => listener.remove());
      markers.forEach((marker) => (marker.map = null));
    };
  }, [ready, draft, drawing, busy]);
  useEffect(() => {
    if (!ready || !drawing || busy) return;
    const listener = ready.map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      let g: Geometry;
      try {
        g = JSON.parse(draft);
        if (g.type !== 'Polygon' || !Array.isArray(g.coordinates[0])) return;
      } catch {
        g = { type: 'Polygon', coordinates: [[]] };
      }
      const points = ring(g);
      points.push([event.latLng.lng(), event.latLng.lat()]);
      points.push(points[0]);
      setPreview(undefined);
      setDraft(
        JSON.stringify(
          { type: 'Polygon', coordinates: [points, ...g.coordinates.slice(1)] },
          null,
          2,
        ),
      );
    });
    return () => listener.remove();
  }, [ready, drawing, draft, busy]);
  async function impact() {
    setBusy(true);
    setError('');
    try {
      const geometry = JSON.parse(draft) as Geometry;
      if (ring(geometry).length < 3) throw new Error('Mark at least three corners on the map.');
      if (creating) {
        if (!name.trim()) throw new Error('Enter an area name.');
        await api('admin/areas', { method: 'POST', body: json({ nameEn: name.trim(), geometry }) });
        onClose();
        return;
      }
      const result = await api<NonNullable<typeof preview>>(`admin/areas/${area.id}/preview`, {
        method: 'POST',
        body: json({ revision: area.revision, geometry }),
      });
      if (result.affected.length) {
        setDrawing(false);
        setPreview(result);
      } else {
        await api(`admin/areas/${area.id}/commit`, {
          method: 'POST',
          body: json({ previewToken: result.previewToken, assignments: [] }),
        });
        onClose();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      await api(`admin/areas/${area.id}/commit`, {
        method: 'POST',
        body: json({
          previewToken: preview.previewToken,
          assignments: preview.affected.map((r) => ({
            ...r,
            localityId: assignments[r.kind + r.id],
          })),
        }),
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function undo() {
    try {
      const g = JSON.parse(draft) as Geometry;
      const points = ring(g).slice(0, -1);
      if (points.length) points.push(points[0]);
      setDraft(
        JSON.stringify(
          { type: 'Polygon', coordinates: [points, ...g.coordinates.slice(1)] },
          null,
          2,
        ),
      );
      setPreview(undefined);
    } catch {}
  }
  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
      title={creating ? 'Add area' : `Boundary · ${area.name_en}`}
    >
      <fieldset
        className="live-boundary-workbench"
        disabled={busy}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        {creating && (
          <label>
            Area name
            <input
              autoFocus
              required
              maxLength={250}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dhanmondi"
            />
          </label>
        )}
        <p className="small muted">
          Click at least three corners on the map, then save. Pharmacies inside this boundary will
          use this area.
        </p>
        <div className="live-map" ref={container} />
        <div className="live-admin-tools">
          <button className="button button-outline" onClick={() => setDrawing(!drawing)}>
            {drawing ? 'Finish drawing' : 'Draw / add vertices'}
          </button>
          <button onClick={undo}>Undo vertex</button>
          <button
            onClick={() => {
              setDraft(json({ type: 'Polygon', coordinates: [[]] }));
              setPreview(undefined);
            }}
          >
            Clear
          </button>
        </div>
        <p className="small muted">
          Finish drawing to drag corners and adjust the boundary. Adjacent areas can share an edge.
        </p>
        <details>
          <summary>Advanced: import boundary</summary>
          <label>
            Boundary GeoJSON
            <textarea
              className="live-boundary-json"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setPreview(undefined);
              }}
            />
          </label>
        </details>
        {!preview && (
          <button
            className="button"
            disabled={busy || (creating && !name.trim())}
            onClick={() => void impact()}
          >
            {busy ? 'Saving…' : creating ? 'Save area' : 'Save boundary'}
          </button>
        )}
        {preview && (
          <section>
            <h3>{preview.affected.length} affected entrances</h3>
            {preview.affected.map((r) => (
              <label key={r.kind + r.id}>
                Replacement area for {r.kind} {r.id.slice(0, 8)}
                <select
                  value={assignments[r.kind + r.id] || ''}
                  onChange={(e) =>
                    setAssignments({ ...assignments, [r.kind + r.id]: e.target.value })
                  }
                >
                  <option value="">Choose replacement…</option>
                  {localities.map((l) => (
                    <option key={String(l.id)} value={String(l.id)}>
                      {String(l.name_en)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <p className="muted">
              These entrances would fall outside the new boundary. Choose an area covering each
              entrance to save.
            </p>
            <button
              className="button"
              disabled={busy || preview.affected.some((r) => !assignments[r.kind + r.id])}
              onClick={() => void commit()}
            >
              Save boundary & move entrances
            </button>
          </section>
        )}
        {error && <p role="alert">{error}</p>}
      </fieldset>
    </Modal>
  );
}
