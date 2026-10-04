'use client';
import { useState } from 'react';
import { Plus, Link2, Info } from 'lucide-react';
import { useDemo } from '@/mocks/provider';
import { Badge, Modal } from '@/components/ui/primitives';
export function Mappings() {
  const demo = useDemo();
  const [selected, setSelected] = useState('med-1');
  const active = demo.mappings
    .filter((m) => m.medicineId === selected && m.active)
    .map((m) => m.pharmacyId);
  const stock = Object.fromEntries(
    demo.mappings.filter((m) => m.medicineId === selected).map((m) => [m.pharmacyId, m.stock]),
  );
  const [pending, setPending] = useState<string | null>(null);
  const [add, setAdd] = useState(false);
  const [target, setTarget] = useState('ph-4');
  function toggle(id: string) {
    const next = active.includes(id) ? active.filter((x) => x !== id) : [...active, id];
    demo.setMappings((prev) =>
      prev.some((m) => m.medicineId === selected && m.pharmacyId === id)
        ? prev.map((m) =>
            m.medicineId === selected && m.pharmacyId === id ? { ...m, active: !m.active } : m,
          )
        : [...prev, { medicineId: selected, pharmacyId: id, active: true, stock: 'Not provided' }],
    );
    demo.setMedicines((prev) =>
      prev.map((m) =>
        m.id === selected
          ? {
              ...m,
              pharmacies: next.length,
              status: next.length === 0 && m.status === 'Published' ? 'Draft' : m.status,
            }
          : m,
      ),
    );
    demo.notify(
      next.length === 0
        ? 'Final demo mapping removed. Medicine is now Draft.'
        : 'Demo mapping updated. Restore does not automatically republish.',
    );
    setPending(null);
  }
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">PHARMACY CONNECTIONS</span>
          <h1>Medicine mappings</h1>
          <p>Review active pharmacy connections and their publication impact.</p>
        </div>
        <button className="button" onClick={() => setAdd(true)}>
          <Plus size={17} />
          Add mapping
        </button>
      </div>
      <div className="filter-bar">
        <Link2 size={20} />
        <label>
          Sample medicine
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
            }}
          >
            {demo.medicines.map((m) => (
              <option value={m.id} key={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <Badge tone={active.length ? 'teal' : 'amber'}>
          {active.length} active sample mappings
        </Badge>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pharmacy</th>
                <th>Locality</th>
                <th>Optional stock information</th>
                <th>Mapping state</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {demo.records.pharmacies.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <small>{p.detail}</small>
                  </td>
                  <td>{p.area}</td>
                  <td>
                    <select
                      aria-label={`Stock information for ${p.name}`}
                      value={stock[p.id] || 'Not provided'}
                      onChange={(e) =>
                        demo.setMappings((prev) =>
                          prev.map((m) =>
                            m.medicineId === selected && m.pharmacyId === p.id
                              ? { ...m, stock: e.target.value }
                              : m,
                          ),
                        )
                      }
                    >
                      <option>Not provided</option>
                      <option>Sample: listed</option>
                      <option>Sample: unavailable</option>
                    </select>
                  </td>
                  <td>
                    <Badge tone={active.includes(p.id) ? 'teal' : 'neutral'}>
                      {active.includes(p.id) ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => (active.includes(p.id) ? setPending(p.id) : toggle(p.id))}
                    >
                      {active.includes(p.id) ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="info-banner">
        <Info size={20} />
        <p>
          Stock is optional company information. It never controls eligibility or ranking. A
          medicine–pharmacy pair is unique in functional R1.
        </p>
      </div>
      <Modal
        open={pending !== null}
        onOpenChange={(v) => !v && setPending(null)}
        title="Review mapping deactivation"
      >
        <p>
          {active.length === 1
            ? 'This is the final active sample mapping. Removing it will change the medicine to Draft.'
            : 'This pharmacy will no longer be eligible through this sample mapping.'}
        </p>
        <button className="button wide" onClick={() => pending && toggle(pending)}>
          Confirm demo deactivation
        </button>
      </Modal>
      <Modal open={add} onOpenChange={setAdd} title="Add sample mapping">
        <label>
          Pharmacy
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {demo.records.pharmacies.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {active.includes(target) && (
          <p role="alert" className="warning">
            This sample pair already has an active mapping.
          </p>
        )}
        <button
          className="button wide"
          disabled={active.includes(target)}
          onClick={() => {
            toggle(target);
            setAdd(false);
          }}
        >
          Create demo mapping
        </button>
      </Modal>
    </>
  );
}
