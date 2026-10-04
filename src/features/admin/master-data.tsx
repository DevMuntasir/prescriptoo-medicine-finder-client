'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useLegacyTable as useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  LegacyColumnDef as ColumnDef,
} from '@tanstack/react-table/legacy';
import { flexRender, SortingState } from '@tanstack/react-table';
import {
  Search,
  Plus,
  ArrowUpRight,
  ArrowLeft,
  Save,
  Archive,
  RotateCcw,
  MapPin,
  Info,
  ShieldCheck,
  KeyRound,
  ArrowUpDown,
} from 'lucide-react';
import { useDemo } from '@/mocks/provider';
import { DemoRecord, Medicine } from '@/contracts';
import { Badge, Empty, Modal } from '@/components/ui/primitives';
import { useClientReady } from '@/components/ui/use-client-ready';
import { upsertRecord, isDuplicate, createDemoId } from './mutation';
const labels: Record<string, { title: string; singular: string; description: string }> = {
  medicines: {
    title: 'Medicines',
    singular: 'medicine',
    description: 'A clear, bilingual catalogue for your patient directory.',
  },
  pharmacies: {
    title: 'Pharmacies',
    singular: 'pharmacy',
    description: 'Connect your catalogue to your local pharmacy network.',
  },
  doctors: {
    title: 'Doctors & chambers',
    singular: 'doctor',
    description: 'Company profiles and area-scoped chamber associations.',
  },
  areas: {
    title: 'Areas & boundaries',
    singular: 'area',
    description: 'Organize your localities and review illustrative boundaries.',
  },
  users: {
    title: 'Team members',
    singular: 'team member',
    description: 'Preview team access, account status and temporary credentials.',
  },
  roles: {
    title: 'Roles & permissions',
    singular: 'role',
    description: 'Keep management and analytics scopes explicit and separate.',
  },
  qrs: {
    title: 'QR cards',
    singular: 'QR card',
    description: 'Create a clear path from a sample card to a medicine.',
  },
};
export function MasterData({ section, id }: { section: string; id?: string }) {
  const { medicines, records, persona } = useDemo();
  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [scenario, setScenario] = useState('Ready');
  const [sorting, setSorting] = useState<SortingState>([]);
  const label = labels[section] || labels.medicines;
  const data: DemoRecord[] =
    section === 'medicines'
      ? medicines.map((m) => ({
          id: m.id,
          name: m.name,
          detail: `${m.generic} · ${m.strength} · ${m.form}`,
          area: `${m.pharmacies} mapped pharmacies`,
          status: m.status,
        }))
      : records[section] || [];
  const filtered = data.filter(
    (r) =>
      (status === 'All statuses' || r.status === status) &&
      (persona !== 'Area manager' ||
        !['pharmacies', 'areas'].includes(section) ||
        r.area.includes('Dhanmondi') ||
        r.name === 'Dhanmondi'),
  );
  const columns: ColumnDef<DemoRecord>[] = [
    {
      accessorKey: 'name',
      header: () => (
        <span>
          Name <ArrowUpDown size={12} />
        </span>
      ),
      cell: ({ row }) => (
        <>
          <strong>{row.original.name}</strong>
          <small>{row.original.detail}</small>
        </>
      ),
    },
    { accessorKey: 'area', header: section === 'medicines' ? 'Mappings' : 'Scope / locality' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => (
        <Badge tone={['Published', 'Active'].includes(getValue<string>()) ? 'teal' : 'amber'}>
          {getValue<string>()}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Link
          className="text-link"
          href={`/admin/${section}/${row.original.id}${section === 'areas' ? '/boundary' : ''}`}
        >
          {section === 'qrs' ? 'Preview' : section === 'areas' ? 'Edit boundary' : 'Edit'}
          <ArrowUpRight size={14} />
        </Link>
      ),
    },
  ];
  const table = useReactTable({
    data: filtered,
    columns,
    state: { globalFilter: filter, sorting },
    onGlobalFilterChange: setFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  if (id) return <RecordForm key={`${section}/${id}`} section={section} id={id} />;
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">MASTER DATA</span>
          <h1>{label.title}</h1>
          <p>{label.description}</p>
        </div>
        <Link className="button" href={`/admin/${section}/new`}>
          <Plus size={17} />
          Add {label.singular}
        </Link>
      </div>
      <div className="panel">
        <div className="data-toolbar">
          <label className="search-box">
            <Search size={17} />
            <input
              placeholder={`Search ${label.title.toLowerCase()}`}
              aria-label={`Search ${label.title}`}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>All statuses</option>
            {[...new Set(data.map((r) => r.status))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <label className="scenario-control">
            Preview
            <select
              aria-label="Data preview state"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            >
              {['Ready', 'Loading', 'Empty', 'Error', 'Denied'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        {scenario === 'Loading' ? (
          <div className="skeleton-table" aria-label="Loading records" />
        ) : scenario !== 'Ready' || table.getRowModel().rows.length === 0 ? (
          <Empty
            title={
              scenario === 'Error'
                ? 'Records couldn’t load.'
                : scenario === 'Denied'
                  ? 'Permission required.'
                  : 'No matching sample records.'
            }
          >
            <button
              className="button button-outline"
              onClick={() => {
                setFilter('');
                setStatus('All statuses');
                setScenario('Ready');
              }}
            >
              Reset preview
            </button>
          </Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((h) => (
                      <th key={h.id}>
                        {h.column.getCanSort() ? (
                          <button
                            className="table-sort"
                            onClick={h.column.getToggleSortingHandler()}
                          >
                            {flexRender(h.column.columnDef.header, h.getContext())}
                          </button>
                        ) : (
                          flexRender(h.column.columnDef.header, h.getContext())
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((c) => (
                      <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-footer">
          {table.getRowModel().rows.length} of {data.length} sample records{' '}
          <span>Demo edits reset on refresh</span>
        </div>
      </div>
      {section === 'areas' && (
        <div className="info-banner">
          <MapPin size={20} />
          <p>
            Hierarchy: Division → District → Thana → Locality. Shapes and validation here are
            illustrative; real containment, overlap and atomic reassignment require PostGIS.
          </p>
        </div>
      )}
      {section === 'qrs' && (
        <div className="info-banner">
          <Info size={20} />
          <p>
            QR identity is immutable after creation. Preview medicine, doctor/chamber, active state
            and printed layout without generating a production token.
          </p>
        </div>
      )}
    </>
  );
}
const formSchema = z.object({
  name: z.string().trim().min(2, 'Enter at least two characters.'),
  detail: z.string().trim().min(2, 'Add a short description.'),
  area: z.string().min(1, 'Select a scope or area.'),
  nameBn: z.string(),
  strength: z.string(),
  form: z.string(),
  status: z.enum(['Published', 'Draft', 'Archived', 'Active', 'Inactive']),
  reason: z.string(),
});
type FormValues = z.infer<typeof formSchema>;
function RecordForm({ section, id }: { section: string; id: string }) {
  const router = useRouter();
  const clientReady = useClientReady();
  const demo = useDemo();
  const label = labels[section] || labels.medicines;
  const isNew = id === 'new';
  const medicine = demo.medicines.find((m) => m.id === id);
  const record = demo.records[section]?.find((r) => r.id === id);
  const found = section === 'medicines' ? medicine : record;
  const [impact, setImpact] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [chamber, setChamber] = useState(
    record?.metadata?.chamber || 'Dhanmondi chamber · Sample Road 7',
  );
  const [grant, setGrant] = useState(record?.metadata?.grants || ['Read']);
  const [management, setManagement] = useState(record?.metadata?.managementScope || 'Dhanmondi');
  const [analytics, setAnalytics] = useState(record?.metadata?.analyticsScope || 'All areas');
  const [latitude, setLatitude] = useState(record?.metadata?.latitude || '23.7465');
  const [longitude, setLongitude] = useState(record?.metadata?.longitude || '90.3762');
  const [hours, setHours] = useState(record?.metadata?.hours || '');
  const [phone, setPhone] = useState(record?.metadata?.phone || '');
  const [qrMedicine, setQrMedicine] = useState(record?.metadata?.medicineId || 'med-1');
  const [qrDoctor, setQrDoctor] = useState(record?.metadata?.doctorId || '');
  const scoped = section === 'doctors' && demo.persona === 'Area manager';
  const values: FormValues = {
    name: medicine?.name || record?.name || '',
    detail: medicine?.generic || record?.detail || '',
    area: record?.area || 'Dhanmondi',
    nameBn: medicine?.nameBn || '',
    strength: medicine?.strength || '500 mg',
    form: medicine?.form || 'Tablet',
    status: medicine?.status || record?.status || (section === 'medicines' ? 'Draft' : 'Active'),
    reason: '',
  };
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setError,
    control,
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: values });
  const name = useWatch({ control, name: 'name' });
  const candidates = section === 'medicines' ? demo.medicines : demo.records[section] || [];
  const duplicate = isDuplicate(candidates, name, id);
  function submit(v: FormValues) {
    const savedId = isNew ? createDemoId() : id;
    if (conflict) {
      demo.notify('Simulated revision conflict: refresh or reapply before saving.');
      return;
    }
    if (duplicate && !v.reason.trim()) {
      setError('reason', { message: 'A duplicate override reason is required.' });
      return;
    }
    if (section === 'medicines' && v.status === 'Published' && !medicine?.pharmacies) {
      setError('status', {
        message: 'At least one eligible mapping is required before publication.',
      });
      return;
    }
    if (section === 'medicines') {
      const m: Medicine = {
        id: savedId,
        slug: medicine?.slug || savedId,
        name: v.name,
        nameBn: v.nameBn || undefined,
        generic: v.detail,
        strength: v.strength,
        form: v.form,
        category: medicine?.category || 'Everyday care',
        status: v.status,
        color: medicine?.color || 'mint',
        pharmacies: medicine?.pharmacies || 0,
      };
      demo.setMedicines((prev) => (isNew ? [...prev, m] : prev.map((x) => (x.id === id ? m : x))));
    } else {
      const r: DemoRecord = {
        id: savedId,
        name: scoped ? record?.name || v.name : v.name,
        detail: scoped ? record?.detail || v.detail : v.detail,
        area: v.area,
        status: v.status,
        metadata: {
          ...record?.metadata,
          grants: grant,
          managementScope: management,
          analyticsScope: analytics,
          chamber,
          latitude,
          longitude,
          hours,
          phone,
          medicineId: qrMedicine,
          doctorId: qrDoctor,
        },
      };
      demo.setRecords((prev) => ({ ...prev, [section]: upsertRecord(prev[section] || [], r) }));
    }
    demo.notify(`Demo ${label.singular} saved. Changes reset on refresh.`);
    reset(v);
    router.push(`/admin/${section}`);
  }
  function archive() {
    if (section === 'users' && id === 'usr-1') {
      demo.notify('Last-administrator protection: this sample account cannot be disabled.');
      setImpact(false);
      return;
    }
    if (section === 'medicines') {
      demo.setMedicines((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, status: m.status === 'Archived' ? 'Draft' : 'Archived' } : m,
        ),
      );
    } else
      demo.setRecords((prev) => ({
        ...prev,
        [section]: prev[section].map((r) =>
          r.id === id ? { ...r, status: r.status === 'Active' ? 'Inactive' : 'Active' } : r,
        ),
      }));
    demo.notify('Demo lifecycle updated. Restore does not automatically republish medicines.');
    setImpact(false);
    router.push(`/admin/${section}`);
  }
  if (!isNew && !found)
    return (
      <Empty title="This sample record couldn’t be found.">
        <Link className="button" href={`/admin/${section}`}>
          Back to list
        </Link>
      </Empty>
    );
  return (
    <>
      <Link
        className="back-link"
        href={`/admin/${section}`}
        onClick={(e) => {
          if (isDirty && !window.confirm('Discard unsaved demo changes?')) e.preventDefault();
        }}
      >
        <ArrowLeft size={16} />
        Back to {label.title.toLowerCase()}
      </Link>
      <div className="admin-title">
        <div>
          <span className="eyebrow">{isNew ? 'NEW RECORD' : 'RECORD DETAILS'}</span>
          <h1>{isNew ? `Add ${label.singular}` : values.name}</h1>
          <p>
            {scoped
              ? 'Global doctor profile is read-only. Preview editable in-scope chamber details.'
              : 'Validate and preview company information before saving.'}
          </p>
        </div>
        <Badge tone="amber">Demo form · not persisted</Badge>
      </div>
      <form onSubmit={handleSubmit(submit)} aria-busy={!clientReady}>
        <fieldset disabled={!clientReady} className="form-fields">
          <div className="form-grid">
            <section className="panel form-panel">
              <h2>
                {section === 'medicines'
                  ? 'Medicine information'
                  : section === 'roles'
                    ? 'Role details'
                    : 'Basic information'}
              </h2>
              <p className="muted small">Fields marked * are required for this preview.</p>
              <label>
                {section === 'medicines' ? 'Medicine name (English)' : 'Name'} *
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => <input {...field} readOnly={scoped} />}
                />
                {errors.name && (
                  <span role="alert" className="error-text">
                    {errors.name.message}
                  </span>
                )}
              </label>
              {section === 'medicines' && (
                <label>
                  Medicine name (বাংলা)
                  <input {...register('nameBn')} />
                  <small className="muted">Leave blank to preview English content fallback.</small>
                </label>
              )}
              <label>
                {section === 'medicines' ? 'Generic name' : 'Description'} *
                <input {...register('detail')} readOnly={scoped} />
                {errors.detail && (
                  <span role="alert" className="error-text">
                    {errors.detail.message}
                  </span>
                )}
              </label>
              {section === 'medicines' && (
                <div className="form-row">
                  <label>
                    Strength *<input {...register('strength')} required />
                  </label>
                  <label>
                    Dosage form
                    <select {...register('form')}>
                      <option>Tablet</option>
                      <option>Capsule</option>
                      <option>Sachet</option>
                      <option>Suspension</option>
                    </select>
                  </label>
                </div>
              )}
              <div className="form-row">
                <label>
                  Locality / scope *
                  <select {...register('area')}>
                    <option>Dhanmondi</option>
                    <option>Kalabagan</option>
                    <option>Lalmatia</option>
                    <option>All areas</option>
                    {record?.area &&
                      !['Dhanmondi', 'Kalabagan', 'Lalmatia', 'All areas'].includes(
                        record.area,
                      ) && <option>{record.area}</option>}
                  </select>
                </label>
                <label>
                  Status
                  <select {...register('status')}>
                    {(section === 'medicines'
                      ? ['Draft', 'Published', 'Archived']
                      : ['Active', 'Inactive']
                    ).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                  {errors.status && (
                    <span role="alert" className="error-text">
                      {errors.status.message}
                    </span>
                  )}
                </label>
              </div>
              {duplicate && (
                <div className="warning">
                  <strong>A similar sample record already exists.</strong>
                  <p>Review the candidate before overriding this warning.</p>
                  <label>
                    Override reason *<textarea {...register('reason')} />
                    {errors.reason && <span className="error-text">{errors.reason.message}</span>}
                  </label>
                </div>
              )}
              {section === 'doctors' && (
                <div className="chamber-section">
                  <h3>Chambers in your scope</h3>
                  <p className="small muted">
                    Global profile and chamber edits are separate operations in functional R1.
                  </p>
                  <label>
                    Dhanmondi chamber
                    <input value={chamber} onChange={(e) => setChamber(e.target.value)} />
                  </label>
                  <button
                    type="button"
                    className="button button-outline small"
                    onClick={() => {
                      demo.setRecords((prev) => ({
                        ...prev,
                        doctors: prev.doctors.map((r) =>
                          r.id === id ? { ...r, metadata: { ...r.metadata, chamber } } : r,
                        ),
                      }));
                      demo.notify('Demo chamber updated in memory.');
                    }}
                  >
                    Simulate chamber save
                  </button>
                </div>
              )}
              {section === 'pharmacies' && (
                <>
                  <div className="info-banner">
                    <MapPin size={19} />
                    <p>Entrance pin preview: named latitude/longitude fields, kept out of URLs.</p>
                  </div>
                  <div className="form-row">
                    <label>
                      Demo latitude
                      <input
                        type="number"
                        step="any"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                      />
                    </label>
                    <label>
                      Demo longitude
                      <input
                        type="number"
                        step="any"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    Optional opening hours
                    <input
                      placeholder="Information only — does not affect ranking"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                    />
                  </label>
                  <label>
                    Optional phone
                    <input
                      placeholder="Use invented demo text only"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </label>
                </>
              )}
              {section === 'qrs' && (
                <>
                  <h3>Card identity</h3>
                  <label>
                    Medicine
                    <select value={qrMedicine} onChange={(e) => setQrMedicine(e.target.value)}>
                      {demo.medicines
                        .filter((m) => m.status === 'Published')
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Optional doctor referral
                    <select value={qrDoctor} onChange={(e) => setQrDoctor(e.target.value)}>
                      <option value="">Medicine-only</option>
                      {demo.records.doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="small muted">
                    The selected medicine/doctor/chamber tuple becomes immutable after creation in
                    functional R1.
                  </p>
                </>
              )}
              {section === 'roles' && (
                <>
                  <h3>Module/action grants</h3>
                  <div className="grant-grid">
                    {['Read', 'Create', 'Edit', 'Archive', 'Publish', 'Print', 'Analytics'].map(
                      (g) => (
                        <label className="checkbox-line" key={g}>
                          <input
                            type="checkbox"
                            checked={grant.includes(g)}
                            onChange={() =>
                              setGrant((prev) =>
                                prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
                              )
                            }
                          />
                          {g}
                        </label>
                      ),
                    )}
                  </div>
                  <div className="form-row">
                    <label>
                      Management scope
                      <select value={management} onChange={(e) => setManagement(e.target.value)}>
                        <option>Dhanmondi</option>
                        <option>All areas</option>
                      </select>
                    </label>
                    <label>
                      Analytics scope
                      <select value={analytics} onChange={(e) => setAnalytics(e.target.value)}>
                        <option>All areas</option>
                        <option>Dhanmondi</option>
                        <option>No analytics</option>
                      </select>
                    </label>
                  </div>
                  <details>
                    <summary>Area descendants</summary>
                    <label className="checkbox-line">
                      <input type="checkbox" defaultChecked />
                      Dhaka → Dhanmondi → Sample Locality A
                    </label>
                    <label className="checkbox-line">
                      <input type="checkbox" />
                      Dhaka → Kalabagan → Sample Locality B
                    </label>
                  </details>
                  <p className="small muted">
                    Grant choices are presentation previews. Real policy enforcement is deferred.
                  </p>
                </>
              )}
            </section>
            <aside>
              <section className="panel form-panel">
                <h3>
                  <ShieldCheck size={18} />
                  Publication & lifecycle
                </h3>
                <p className="small muted">
                  {section === 'medicines'
                    ? `${medicine?.pharmacies || 0} eligible sample pharmacy mappings. Publishing requires at least one; removing the final mapping auto-unpublishes in functional R1.`
                    : 'Archive/disable impacts are shown before applying a demo change.'}
                </p>
                <label className="checkbox-line">
                  <input
                    type="checkbox"
                    checked={conflict}
                    onChange={(e) => setConflict(e.target.checked)}
                  />
                  Simulate stale revision
                </label>
                {conflict && (
                  <div className="warning">
                    <p>Another staff member changed this sample record.</p>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        setConflict(false);
                        reset(values);
                      }}
                    >
                      Refresh record
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setConflict(false)}
                    >
                      Reapply current edits
                    </button>
                  </div>
                )}
              </section>
              {!isNew && (
                <section className="panel form-panel">
                  <h3>Record actions</h3>
                  {section === 'users' && (
                    <button
                      type="button"
                      className="button button-outline wide"
                      onClick={() =>
                        demo.notify(
                          'Demo reset issued. Existing sessions remain active in the proposed functional rule; disabling the account revokes them.',
                        )
                      }
                    >
                      <KeyRound size={16} />
                      Preview password reset
                    </button>
                  )}
                  <button
                    type="button"
                    className="button button-outline wide"
                    onClick={() => setImpact(true)}
                  >
                    {['Archived', 'Inactive'].includes(values.status) ? (
                      <RotateCcw size={16} />
                    ) : (
                      <Archive size={16} />
                    )}{' '}
                    {['Archived', 'Inactive'].includes(values.status)
                      ? 'Restore / reactivate'
                      : 'Archive / disable'}
                  </button>
                </section>
              )}
            </aside>
          </div>
          <div className="form-actions">
            <Link className="button button-outline" href={`/admin/${section}`}>
              Cancel
            </Link>
            <button className="button" type="submit">
              <Save size={16} />
              Save demo {label.singular}
            </button>
          </div>
        </fieldset>
      </form>
      <Modal open={impact} onOpenChange={setImpact} title="Review lifecycle impact">
        <div className="info-banner">
          <Info size={20} />
          <p>
            {section === 'pharmacies'
              ? 'Archiving a pharmacy makes its mappings ineligible. Medicines losing their final mapping must unpublish. Restoring must not automatically republish.'
              : section === 'doctors'
                ? 'Doctor/chamber deactivation affects linked referral cards. QR identity stays immutable.'
                : section === 'users'
                  ? 'Disable revokes sessions in functional R1. The final active administrator cannot be disabled.'
                  : 'This demo action changes status only. Publication and linked QR impacts need transactional backend enforcement.'}
          </p>
        </div>
        <button className="button wide" onClick={archive}>
          Apply simulated lifecycle change
        </button>
      </Modal>
    </>
  );
}
