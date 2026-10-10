'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Undo2, Trash2, Plus, Save, MapPin, Info } from 'lucide-react';
import { useDemo } from '@/mocks/provider';
import { SchematicMap } from '@/components/ui/schematic-map';
import { Badge, Modal } from '@/components/ui/primitives';
export function BoundaryEditor({ id }: { id: string }) {
  const demo = useDemo();
  const area = demo.records.areas.find((r) => r.id === id);
  const [points, setPoints] = useState<[number, number][]>([
    [160, 130],
    [350, 110],
    [410, 270],
    [230, 320],
  ]);
  const [scenario, setScenario] = useState('Valid');
  const [preview, setPreview] = useState(false);
  const [destinations, setDestinations] = useState(['Kalabagan', 'Lalmatia']);
  const [mode, setMode] = useState('Select');
  const [committed, setCommitted] = useState(false);
  const valid = scenario === 'Valid' || scenario === 'Shared edge';
  return (
    <>
      <Link className="back-link" href="/admin/areas">
        <ArrowLeft size={16} />
        Back to areas
      </Link>
      <div className="admin-title">
        <div>
          <span className="eyebrow">LOCALITY BOUNDARY PREVIEW</span>
          <h1>{area?.name || 'Sample locality'}</h1>
          <p>Own the shape, review the impact. Geometry and validation are simulated.</p>
        </div>
        <Badge tone="amber">Revision 3 · demo geometry</Badge>
      </div>
      <div className="boundary-grid">
        <section className="panel">
          <div className="boundary-toolbar">
            <div className="segmented">
              {['Select', 'Add vertex'].map((m) => (
                <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
                  {m === 'Add vertex' && <Plus size={14} />} {m}
                </button>
              ))}
            </div>
            <button
              className="icon-button"
              aria-label="Undo last vertex"
              disabled={points.length === 0}
              onClick={() => setPoints(points.slice(0, -1))}
            >
              <Undo2 size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Clear polygon"
              onClick={() => setPoints([])}
            >
              <Trash2 size={18} />
            </button>
          </div>
          <div
            onClick={(e) => {
              if (mode !== 'Add vertex') return;
              const bounds = e.currentTarget.getBoundingClientRect();
              setPoints([
                ...points,
                [
                  ((e.clientX - bounds.left) / bounds.width) * 600,
                  ((e.clientY - bounds.top) / bounds.height) * 500,
                ],
              ]);
            }}
          >
            <SchematicMap>
              <svg
                className="polygon-overlay"
                viewBox="0 0 600 500"
                preserveAspectRatio="none"
                aria-label="Illustrative locality polygon"
              >
                <polygon
                  points={points.map((p) => p.join(',')).join(' ')}
                  fill="var(--brand-soft)"
                  stroke="var(--brand-blue)"
                  strokeWidth="3"
                />
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p[0]}
                    cy={p[1]}
                    r="7"
                    fill="white"
                    stroke="var(--brand-blue)"
                    strokeWidth="3"
                  />
                ))}
              </svg>
            </SchematicMap>
          </div>
          <div className="boundary-vertices">
            <strong>{points.length} vertices</strong>
            <p className="small muted">
              Add vertices by clicking the illustrative map. Edit numeric positions below.
            </p>
            {points.map((p, i) => (
              <div className="vertex-row" key={i}>
                <span>{i + 1}</span>
                <label>
                  X
                  <input
                    aria-label={`Vertex ${i + 1} X`}
                    type="number"
                    min="0"
                    max="600"
                    value={Math.round(p[0])}
                    onChange={(e) =>
                      setPoints(
                        points.map((q, j) => (j === i ? [Number(e.target.value), q[1]] : q)),
                      )
                    }
                  />
                </label>
                <label>
                  Y
                  <input
                    aria-label={`Vertex ${i + 1} Y`}
                    type="number"
                    min="0"
                    max="500"
                    value={Math.round(p[1])}
                    onChange={(e) =>
                      setPoints(
                        points.map((q, j) => (j === i ? [q[0], Number(e.target.value)] : q)),
                      )
                    }
                  />
                </label>
                <button
                  className="icon-button"
                  aria-label={`Delete vertex ${i + 1}`}
                  onClick={() => setPoints(points.filter((_, j) => i !== j))}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
        <aside>
          <section className="panel form-panel">
            <h3>Validation scenario</h3>
            <label>
              Simulate result
              <select value={scenario} onChange={(e) => setScenario(e.target.value)}>
                {[
                  'Valid',
                  'Self-intersection',
                  'Sibling overlap',
                  'Full containment',
                  'Outside parent',
                  'Shared edge',
                  'Ambiguous pharmacy edge',
                  'Stale revision',
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <div className={valid ? 'info-banner' : 'warning'}>
              <Info size={18} />
              <p>
                {valid
                  ? 'Shared edges are allowed. Positive-area overlap must be rejected in functional R1.'
                  : scenario === 'Stale revision'
                    ? 'This sample revision is outdated. Refresh before committing.'
                    : scenario === 'Ambiguous pharmacy edge'
                      ? 'A pharmacy on a shared edge needs an explicit locality selection.'
                      : `${scenario} must be rejected by server-side PostGIS validation.`}
              </p>
            </div>
            <p className="small muted">
              This editor uses schematic pixels, not persisted GeoJSON. Source/parent containment
              and transactional correctness are deferred.
            </p>
            <button
              className="button wide"
              disabled={points.length < 3}
              onClick={() => setPreview(true)}
            >
              <MapPin size={17} />
              Preview impact
            </button>
          </section>
          <section className="panel form-panel">
            <h3>Boundary ownership</h3>
            <p className="small muted">
              Company A → Dhaka → Dhaka South → {area?.name || 'Sample locality'}
            </p>
            <Badge>Licensed real dataset pending</Badge>
          </section>
        </aside>
      </div>
      {committed && (
        <p role="status" className="success-text">
          Demo boundary and reassignment preview applied. No geometry or records were persisted.
        </p>
      )}
      <Modal open={preview} onOpenChange={setPreview} title="Review affected pharmacies">
        <p>
          Two synthetic pharmacies are affected by the edited shape. All replacements must be
          reviewed together.
        </p>
        {['Green Cross Pharmacy', 'Carewell Pharmacy'].map((name, i) => (
          <label key={name}>
            {name}
            <select
              value={destinations[i]}
              onChange={(e) =>
                setDestinations(destinations.map((d, j) => (j === i ? e.target.value : d)))
              }
            >
              <option>Kalabagan</option>
              <option>Lalmatia</option>
              <option>Dhanmondi</option>
            </select>
          </label>
        ))}
        {!valid && (
          <p className="warning" role="alert">
            {scenario}: this simulated commit is blocked. Change the validation preview before
            retrying.
          </p>
        )}
        <p className="small muted">
          Functional R1 rechecks revision, sibling boundaries, permissions and assignments in one
          transaction. A preview cannot authorize a stale commit.
        </p>
        <button
          className="button wide"
          disabled={!valid}
          onClick={() => {
            setCommitted(true);
            setPreview(false);
            demo.notify('Boundary commit simulated. No actual geometry was saved.');
          }}
        >
          <Save size={16} />
          Apply demo preview
        </button>
      </Modal>
    </>
  );
}
