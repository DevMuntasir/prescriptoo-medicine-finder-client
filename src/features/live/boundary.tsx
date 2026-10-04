'use client';
import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/primitives';
import { api, json } from '@/lib/api';
import type * as Leaflet from 'leaflet';
import { addTiles } from './tiles';
type Row = Record<string, unknown>;
type Geometry = { type: 'Polygon'; coordinates: number[][][] };
const ring = (g: Geometry) => g.coordinates[0]?.slice(0, -1) || [];
export function BoundaryWorkbench({ area, onClose }: { area: Row; onClose: () => void }) {
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
    [ready, setReady] = useState<{ L: typeof Leaflet; map: Leaflet.Map }>(),
    fitted = useRef(false),
    [drawing, setDrawing] = useState(false);
  useEffect(() => {
    let active = true;
    api<Row[]>('admin/areas')
      .then((rows) => {
        if (active) setLocalities(rows.filter((r) => r.type === 'locality' && r.id !== area.id));
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    let map: Leaflet.Map | undefined;
    let observer: ResizeObserver | undefined;
    void import('leaflet')
      .then((L) => {
        if (!active || !container.current) return;
        map = L.map(container.current, { scrollWheelZoom: false }).setView([23.78, 90.4], 14);
        addTiles(L, map, () => {
          if (active) setError('Map tiles unavailable. You can still edit GeoJSON below.');
        });
        observer = new ResizeObserver(() => map?.invalidateSize());
        observer.observe(container.current);
        setReady({ L, map });
      })
      .catch(() => {
        if (active) setError('Map unavailable. Edit GeoJSON below.');
      });
    return () => {
      active = false;
      observer?.disconnect();
      map?.remove();
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
    const { L, map } = ready;
    const valid = (p: number[]) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
    if (!g.coordinates.every((r) => Array.isArray(r) && r.every(valid))) return;
    const vertices = ring(g);
    const layers = L.layerGroup().addTo(map);
    const shape = L.polygon(
      g.coordinates.map((r) => r.map((p) => [p[1], p[0]] as Leaflet.LatLngTuple)),
      {
        color: '#14796c',
        fillOpacity: 0.2,
        interactive: false,
      },
    ).addTo(layers);
    if (!fitted.current && shape.getBounds().isValid()) {
      map.fitBounds(shape.getBounds(), { padding: [24, 24], maxZoom: 16 });
      fitted.current = true;
    }
    if (!drawing)
      vertices.forEach((p, index) => {
        const marker = L.marker([p[1], p[0]], {
          draggable: true,
          title: `Boundary vertex ${index + 1}`,
          icon: L.divIcon({
            className: 'entrance-pin',
            html: '<span></span>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        }).addTo(layers);
        marker.on('dragend', () => {
          const point = marker.getLatLng().wrap();
          const next = vertices.map((v, i) => (i === index ? [point.lng, point.lat] : v));
          if (next.length) next.push(next[0]);
          setPreview(undefined);
          setDraft(
            JSON.stringify(
              { type: 'Polygon', coordinates: [next, ...g.coordinates.slice(1)] },
              null,
              2,
            ),
          );
        });
      });
    return () => {
      layers.remove();
    };
  }, [ready, draft, drawing]);
  useEffect(() => {
    if (!ready || !drawing) return;
    const pick = (e: Leaflet.LeafletMouseEvent) => {
      let g: Geometry;
      try {
        g = JSON.parse(draft);
        if (g.type !== 'Polygon' || !Array.isArray(g.coordinates[0])) return;
      } catch {
        g = { type: 'Polygon', coordinates: [[]] };
      }
      const points = ring(g);
      const p = e.latlng.wrap();
      points.push([p.lng, p.lat]);
      points.push(points[0]);
      setPreview(undefined);
      setDraft(
        JSON.stringify(
          { type: 'Polygon', coordinates: [points, ...g.coordinates.slice(1)] },
          null,
          2,
        ),
      );
    };
    ready.map.on('click', pick);
    return () => {
      ready.map.off('click', pick);
    };
  }, [ready, drawing, draft]);
  async function impact() {
    setBusy(true);
    setError('');
    try {
      setPreview(
        await api(`admin/areas/${area.id}/preview`, {
          method: 'POST',
          body: json({ revision: area.revision, geometry: JSON.parse(draft) }),
        }),
      );
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
        if (!open) onClose();
      }}
      title={`Boundary · ${area.name_en}`}
    >
      <div className="live-boundary-workbench">
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
          Draw by clicking the map; drag editable vertices to adjust. Shared edges are allowed.
          Sibling interiors must not overlap. Without a configured map, paste licensed GeoJSON
          below.
        </p>
        <label>
          Owned boundary GeoJSON
          <textarea
            className="live-boundary-json"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setPreview(undefined);
            }}
          />
        </label>
        <button className="button" disabled={busy} onClick={() => void impact()}>
          Validate & preview impact
        </button>
        {preview && (
          <section>
            <h3>{preview.affected.length} affected entrances</h3>
            {preview.affected.map((r) => (
              <label key={r.kind + r.id}>
                Replacement locality for {r.kind} {r.id.slice(0, 8)}
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
              All boundary and assignment changes commit together. A stale record requires another
              preview.
            </p>
            <button
              className="button"
              disabled={busy || preview.affected.some((r) => !assignments[r.kind + r.id])}
              onClick={() => void commit()}
            >
              Commit boundary & assignments
            </button>
          </section>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
