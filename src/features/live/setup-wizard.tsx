'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, json } from '@/lib/api';
import { Modal } from '@/components/ui/primitives';
import { EntrancePicker } from './entrance-picker';

type Area = { id: string; name_en: string };
type Shop = { id: string; name_en: string; address_en: string; archived_at?: string };
type Pharmacy = {
  nameEn: string;
  nameBn: string;
  addressEn: string;
  addressBn: string;
  phone: string;
  hours: string;
  overrideReason?: string;
  localityId?: string;
  location: { latitude: number; longitude: number };
};
const blankShop = { nameEn: '', nameBn: '', addressEn: '', addressBn: '', phone: '', hours: '' };

function PharmacyEntry({
  initial,
  onAdd,
  onCancel,
}: {
  initial?: Pharmacy;
  onAdd: (p: Pharmacy) => void;
  onCancel: () => void;
}) {
  const [details, setDetails] = useState({
    ...blankShop,
    ...initial,
    overrideReason: initial?.overrideReason || '',
  });
  const [point, setPoint] = useState<Pharmacy['location'] | undefined>(initial?.location);
  const [areas, setAreas] = useState<Area[]>([]);
  const [localityId, setLocalityId] = useState('');
  const [checking, setChecking] = useState(!!initial);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!point) return;
    let active = true;
    api<Area[]>('admin/pharmacy-entrance-areas', { method: 'POST', body: json(point) })
      .then((result) => {
        if (!active) return;
        setAreas(result);
        setLocalityId(result.length === 1 ? result[0].id : '');
        if (!result.length)
          setError(
            'No supported area covers this pin. Add a boundary in Areas & boundaries, or move the pin inside an existing area.',
          );
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [point, retry]);
  function pick(p: Pharmacy['location']) {
    setChecking(true);
    setError('');
    setAreas([]);
    setLocalityId('');
    setPoint(p);
  }
  return (
    <form
      className="live-record-form setup-shop"
      onSubmit={(e) => {
        e.preventDefault();
        if (!point || !localityId || checking) return;
        onAdd({
          ...details,
          overrideReason: details.overrideReason || undefined,
          location: point,
          localityId,
        });
      }}
    >
      <h3>New pharmacy</h3>
      <label>
        Pharmacy name
        <input
          required
          maxLength={250}
          value={details.nameEn}
          onChange={(e) => setDetails({ ...details, nameEn: e.target.value })}
        />
      </label>
      <label>
        Address
        <input
          required
          maxLength={250}
          value={details.addressEn}
          onChange={(e) => setDetails({ ...details, addressEn: e.target.value })}
        />
      </label>
      <EntrancePicker latitude={point?.latitude} longitude={point?.longitude} onPick={pick} />
      <div aria-live="polite">
        {checking ? (
          <p>Finding the area…</p>
        ) : areas.length === 1 ? (
          <p className="setup-locality">✓ Area: {areas[0].name_en}</p>
        ) : null}
        {areas.length > 1 && (
          <label>
            This pin touches more than one area. Choose the pharmacy’s area
            <select required value={localityId} onChange={(e) => setLocalityId(e.target.value)}>
              <option value="">Choose area</option>
              {areas.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name_en}
                </option>
              ))}
            </select>
          </label>
        )}
        {error && (
          <p role="alert">
            {error}{' '}
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setError('');
                setChecking(true);
                setRetry(retry + 1);
              }}
            >
              Retry area check
            </button>
          </p>
        )}
      </div>
      <details>
        <summary>Phone, Bengali details & other options</summary>
        {(['nameBn', 'addressBn', 'phone', 'hours', 'overrideReason'] as const).map((key, i) => (
          <label key={key}>
            {
              [
                'Name in Bengali',
                'Address in Bengali',
                'Phone',
                'Opening hours',
                'Duplicate override reason (only if needed)',
              ][i]
            }
            <input
              value={details[key]}
              onChange={(e) => setDetails({ ...details, [key]: e.target.value })}
            />
          </label>
        ))}
      </details>
      <details>
        <summary>Enter entrance coordinates manually</summary>
        <p>Use this when the map is unavailable. Locality is still checked automatically.</p>
        <label>
          Entrance latitude
          <input
            type="number"
            step="any"
            min={-90}
            max={90}
            value={point?.latitude ?? ''}
            onChange={(e) => {
              if (e.target.value !== '')
                pick({ latitude: Number(e.target.value), longitude: point?.longitude ?? 90.4 });
            }}
          />
        </label>
        <label>
          Entrance longitude
          <input
            type="number"
            step="any"
            min={-180}
            max={180}
            value={point?.longitude ?? ''}
            onChange={(e) => {
              if (e.target.value !== '')
                pick({ latitude: point?.latitude ?? 23.8, longitude: Number(e.target.value) });
            }}
          />
        </label>
      </details>
      <div className="setup-actions">
        <button type="button" className="button button-outline" onClick={onCancel}>
          Cancel pharmacy
        </button>
        <button className="button" disabled={!localityId || checking}>
          Use this pharmacy
        </button>
      </div>
    </form>
  );
}

export function SetupWizard({
  mode,
  canCreatePharmacy,
  onClose,
  onSaved,
}: {
  mode: 'medicine' | 'pharmacy';
  canCreatePharmacy: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [step, setStep] = useState(mode === 'medicine' ? 0 : 1);
  const [medicine, setMedicine] = useState({
    nameEn: '',
    nameBn: '',
    genericEn: '',
    genericBn: '',
    strength: '',
    form: '',
    category: '',
    descriptionEn: '',
    descriptionBn: '',
    slug: '',
    overrideReason: '',
  });
  const [shops, setShops] = useState<Shop[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Pharmacy[]>([]);
  const [adding, setAdding] = useState(mode === 'pharmacy');
  const [editingDraft, setEditingDraft] = useState<number>();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(mode === 'medicine');
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [publish, setPublish] = useState(true);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (mode !== 'medicine') return;
    let active = true;
    void (async () => {
      const all: Shop[] = [];
      for (;;) {
        const page = await api<{ items: Shop[]; total: number }>(
          `admin/pharmacies?limit=100&offset=${all.length}`,
        );
        if (!active) return;
        all.push(...page.items);
        if (!page.items.length || all.length >= page.total) break;
      }
      if (active) setShops(all.filter((p) => !p.archived_at));
    })()
      .catch((e) => {
        if (active) setLoadError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, retry]);
  const slug =
    medicine.slug ||
    medicine.nameEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 180)
      .replace(/-$/, '');
  function nextMedicine(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!slug) {
      setError('Enter a public URL name using English letters or numbers in More details.');
      return;
    }
    setStep(1);
  }
  async function save() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await api(mode === 'medicine' ? 'admin/medicine-setup' : 'admin/pharmacies', {
        method: 'POST',
        body: json(
          mode === 'medicine'
            ? {
                medicine: {
                  ...medicine,
                  slug,
                  overrideReason: medicine.overrideReason || undefined,
                },
                pharmacyIds: selected,
                pharmacies: drafts,
                publish,
              }
            : drafts[0],
        ),
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const steps =
    mode === 'medicine' ? ['Medicine', 'Pharmacies', 'Review'] : ['Pharmacy & location', 'Review'];
  return (
    <Modal
      open
      onOpenChange={(v) => {
        if (!v && !saving.current) onClose();
      }}
      title={mode === 'medicine' ? 'Add medicine & pharmacies' : 'Add pharmacy'}
    >
      <div className="setup-wizard">
        <ol className="setup-steps" aria-label="Setup progress">
          {steps.map((label, i) => {
            const index = mode === 'medicine' ? i : i + 1;
            return (
              <li
                key={label}
                aria-current={step === index ? 'step' : undefined}
                className={step >= index ? 'current' : ''}
              >
                <span>{i + 1}</span>
                {label}
              </li>
            );
          })}
        </ol>
        <h2 ref={heading} tabIndex={-1}>
          {step === 0
            ? 'What medicine are you adding?'
            : step === 1
              ? mode === 'medicine'
                ? 'Where can patients find it?'
                : 'Pharmacy details & entrance'
              : 'Ready to save?'}
        </h2>
        {step === 0 && (
          <form className="live-record-form" onSubmit={nextMedicine}>
            <label>
              Medicine name
              <input
                required
                maxLength={250}
                value={medicine.nameEn}
                onChange={(e) => setMedicine({ ...medicine, nameEn: e.target.value })}
              />
            </label>
            <label>
              Generic name
              <input
                required
                maxLength={250}
                value={medicine.genericEn}
                onChange={(e) => setMedicine({ ...medicine, genericEn: e.target.value })}
              />
            </label>
            <div className="setup-two-columns">
              <label>
                Strength (optional)
                <input
                  maxLength={100}
                  placeholder="e.g. 500 mg"
                  value={medicine.strength}
                  onChange={(e) => setMedicine({ ...medicine, strength: e.target.value })}
                />
              </label>
              <label>
                Dosage form (optional)
                <input
                  maxLength={100}
                  placeholder="e.g. Tablet"
                  value={medicine.form}
                  onChange={(e) => setMedicine({ ...medicine, form: e.target.value })}
                />
              </label>
            </div>
            <details>
              <summary>Bengali content & more details</summary>
              {(
                [
                  'nameBn',
                  'genericBn',
                  'category',
                  'descriptionEn',
                  'descriptionBn',
                  'slug',
                  'overrideReason',
                ] as const
              ).map((key, i) => (
                <label key={key}>
                  {
                    [
                      'Name in Bengali',
                      'Generic name in Bengali',
                      'Category',
                      'Description in English',
                      'Description in Bengali',
                      'Public URL name (generated automatically)',
                      'Duplicate override reason (only if needed)',
                    ][i]
                  }
                  <input
                    value={medicine[key]}
                    placeholder={key === 'slug' ? slug : undefined}
                    pattern={key === 'slug' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined}
                    onChange={(e) => setMedicine({ ...medicine, [key]: e.target.value })}
                  />
                </label>
              ))}
            </details>
            <button className="button">Next: choose pharmacies</button>
          </form>
        )}
        {step === 1 && (
          <>
            {mode === 'medicine' && (
              <>
                <p>Select existing pharmacies or add a new one here.</p>
                <label>
                  Find a pharmacy
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by pharmacy name or address"
                  />
                </label>
                {loading && <p role="status">Loading pharmacies…</p>}
                {loadError && (
                  <p role="alert">
                    {loadError}{' '}
                    <button
                      className="text-link"
                      onClick={() => {
                        setLoadError('');
                        setLoading(true);
                        setRetry(retry + 1);
                      }}
                    >
                      Retry
                    </button>
                  </p>
                )}
                <div className="setup-shop-list">
                  {shops
                    .filter((p) =>
                      `${p.name_en} ${p.address_en}`.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((p) => (
                      <label className="setup-shop-choice" key={p.id}>
                        <input
                          type="checkbox"
                          checked={selected.includes(p.id)}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...selected, p.id]
                                : selected.filter((id) => id !== p.id),
                            )
                          }
                        />
                        <span>
                          <strong>{p.name_en}</strong>
                          <small>{p.address_en}</small>
                        </span>
                      </label>
                    ))}
                </div>
                {!loading && !loadError && !shops.length && (
                  <p>No pharmacies yet. Add your first pharmacy below.</p>
                )}
              </>
            )}
            {drafts.map((p, i) => (
              <div className="setup-draft" key={i}>
                <div>
                  <strong>{p.nameEn}</strong>
                  <p>{p.addressEn}</p>
                  <small>New pharmacy · entrance selected · saved at the final step</small>
                </div>
                <button
                  className="text-link"
                  onClick={() => {
                    setEditingDraft(i);
                    setAdding(true);
                  }}
                >
                  Edit
                </button>
                <button
                  className="text-link"
                  onClick={() => {
                    setDrafts(drafts.filter((_, j) => i !== j));
                    if (mode === 'pharmacy') setAdding(true);
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            {adding ? (
              <PharmacyEntry
                key={editingDraft ?? 'new'}
                initial={editingDraft === undefined ? undefined : drafts[editingDraft]}
                onCancel={() => {
                  if (mode === 'pharmacy' && !drafts.length) onClose();
                  else setAdding(false);
                  setEditingDraft(undefined);
                }}
                onAdd={(p) => {
                  setDrafts(
                    editingDraft === undefined
                      ? [...drafts, p]
                      : drafts.map((draft, i) => (i === editingDraft ? p : draft)),
                  );
                  setEditingDraft(undefined);
                  setAdding(false);
                  if (mode === 'pharmacy') setStep(2);
                }}
              />
            ) : (
              canCreatePharmacy &&
              mode === 'medicine' && (
                <button
                  className="button button-outline"
                  onClick={() => {
                    setEditingDraft(undefined);
                    setAdding(true);
                  }}
                >
                  + Add a new pharmacy
                </button>
              )
            )}
            {!adding && (
              <div className="setup-actions">
                {mode === 'medicine' && (
                  <button className="button button-outline" onClick={() => setStep(0)}>
                    Back
                  </button>
                )}
                <button
                  className="button"
                  disabled={!selected.length && !drafts.length}
                  onClick={() => {
                    setError('');
                    setStep(2);
                  }}
                >
                  Next: review
                </button>
              </div>
            )}
          </>
        )}
        {step === 2 && (
          <>
            {mode === 'medicine' && (
              <div className="setup-summary">
                <h3>{medicine.nameEn}</h3>
                <p>
                  {medicine.genericEn} · {medicine.strength} {medicine.form}
                </p>
                <small>Public URL: /en/medicines/{slug}</small>
              </div>
            )}
            <h3>
              {selected.length + drafts.length}{' '}
              {mode === 'medicine' ? 'linked pharmacies' : 'pharmacy'}
            </h3>
            <ul className="setup-review-list">
              {shops
                .filter((p) => selected.includes(p.id))
                .map((p) => (
                  <li key={p.id}>
                    <strong>{p.name_en}</strong>
                    <p>{p.address_en}</p>
                  </li>
                ))}
              {drafts.map((p, i) => (
                <li key={i}>
                  <strong>{p.nameEn} · New</strong>
                  <p>{p.addressEn}</p>
                  <small>
                    Entrance: {p.location.latitude.toFixed(6)}, {p.location.longitude.toFixed(6)}
                  </small>
                </li>
              ))}
            </ul>
            {mode === 'medicine' && (
              <label className="setup-shop-choice">
                <input
                  type="checkbox"
                  checked={publish}
                  onChange={(e) => setPublish(e.target.checked)}
                />
                <span>
                  Publish on the patient site
                  <small>Uncheck to save as draft. Pharmacy listings do not guarantee stock.</small>
                </span>
              </label>
            )}
            <div className="setup-actions">
              <button
                className="button button-outline"
                disabled={busy}
                onClick={() => {
                  setError('');
                  setStep(1);
                }}
              >
                Back
              </button>
              <button className="button" disabled={busy} onClick={() => void save()}>
                {busy ? 'Saving…' : mode === 'medicine' && publish ? 'Save & publish' : 'Save'}
              </button>
            </div>
          </>
        )}
        {error && (
          <p role="alert" className="live-error">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
