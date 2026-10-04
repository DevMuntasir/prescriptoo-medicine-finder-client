'use client';
import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, json, ApiError } from '@/lib/api';
import { Brand } from '@/components/layout/patient-shell';
import { Modal } from '@/components/ui/primitives';
import { BoundaryWorkbench } from './boundary';
import { EntrancePicker } from './entrance-picker';
import { SetupWizard } from './setup-wizard';
import { QRCardPreview } from './qr-card-preview';
import { MedicinePharmacies } from './medicine-pharmacies';
type Row = Record<string, unknown>;
const s = (row: Row, key: string) => String(row[key] ?? '');
const modules = [
  'medicines',
  'pharmacies',
  'mappings',
  'doctors',
  'chambers',
  'areas',
  'qrs',
  'analytics',
  'users',
  'roles',
];
const titles: Record<string, string> = {
  medicines: 'Medicines',
  pharmacies: 'Pharmacies',
  mappings: 'Medicine mappings',
  doctors: 'Doctors',
  chambers: 'Chambers',
  areas: 'Areas & boundaries',
  qrs: 'QR cards',
  analytics: 'Analytics',
  users: 'Team members',
  roles: 'Roles & permissions',
};
const permissions = [
  'users.read',
  'users.write',
  'roles.read',
  'roles.write',
  'medicines.read',
  'medicines.write',
  'pharmacies.read',
  'pharmacies.write',
  'mappings.read',
  'mappings.write',
  'doctors.read',
  'doctors.write',
  'chambers.read',
  'chambers.write',
  'areas.read',
  'areas.write',
  'qrs.read',
  'qrs.write',
  'analytics.read',
  'files.write',
];
interface Field {
  key: string;
  label: string;
  type?: string;
  optional?: boolean;
  options?: { value: string; label: string }[];
}
const nameFields: Field[] = [
  { key: 'nameEn', label: 'Name in English' },
  { key: 'nameBn', label: 'Name in Bengali', optional: true },
];
const emptyForm: Record<string, unknown> = {};
async function allRows(module: string) {
  let offset = 0;
  const items: Row[] = [];
  for (;;) {
    const result = await api<Row[] | { items: Row[]; total: number }>(
      `admin/${module}?limit=100&offset=${offset}`,
    );
    if (Array.isArray(result)) return result;
    items.push(...result.items);
    offset += result.items.length;
    if (!result.items.length || offset >= result.total) return items;
  }
}
export function LiveAdmin({ path }: { path: string[] }) {
  const router = useRouter(),
    section = path[0] || '';
  const [actor, setActor] = useState<Row>();
  const [authReady, setAuthReady] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const rowsRequest = useRef(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<{ row: Row; verb: string; impact?: Row }>();
  const [editing, setEditing] = useState<Row>();
  const [open, setOpen] = useState(false);
  const [wizard, setWizard] = useState<'medicine' | 'pharmacy'>();
  const [mappingMedicine, setMappingMedicine] = useState<Row>();
  const [form, setForm] = useState(emptyForm);
  const [choices, setChoices] = useState<Record<string, Row[]>>({});
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const queryKey = `${section}:${offset}:${search}`;
  const [boundary, setBoundary] = useState<Row>();
  const [job, setJob] = useState<Row>();
  const [previewQrId, setPreviewQrId] = useState<string>();
  const [selectedQrs, setSelectedQrs] = useState<string[]>([]);
  const [from, setFrom] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }),
  );
  const [to, setTo] = useState(from);
  const [report, setReport] = useState<Row>();
  const [dimension, setDimension] = useState('medicine');
  const allowed = useCallback(
    (p: string) => {
      const grants = actor?.permissions as string[] | undefined;
      return grants?.includes('*') || grants?.includes(p);
    },
    [actor],
  );
  useEffect(() => {
    let active = true;
    api<Row>('admin/me')
      .then((a) => {
        if (active) {
          setActor(a);
          setAuthReady(true);
          if (a.mustChangePassword) router.replace('/admin/change-password');
        }
      })
      .catch((e) => {
        if (active) {
          setAuthReady(true);
          if (e instanceof ApiError && e.code === 'PASSWORD_CHANGE_REQUIRED')
            router.replace('/admin/change-password');
        }
      });
    return () => {
      active = false;
    };
  }, [router]);
  const reload = useCallback(async () => {
    if (!section || section === 'analytics' || section === 'login' || section === 'change-password')
      return;
    const id = ++rowsRequest.current;
    try {
      const result = await api<Row[] | { items: Row[]; total: number }>(
        `admin/${section}?limit=50&offset=${offset}&q=${encodeURIComponent(search)}`,
      );
      if (id !== rowsRequest.current) return;
      const filtered = Array.isArray(result)
        ? result.filter((r) =>
            Object.values(r).some(
              (v) => typeof v === 'string' && v.toLowerCase().includes(search.toLowerCase()),
            ),
          )
        : [];
      setRows(Array.isArray(result) ? filtered.slice(offset, offset + 50) : result.items);
      setTotal(Array.isArray(result) ? filtered.length : result.total);
      setLoadedKey(queryKey);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [section, offset, search, queryKey]);
  useEffect(() => {
    if (!actor || !section || ['analytics', 'login', 'change-password'].includes(section)) return;
    let active = true;
    const id = ++rowsRequest.current;
    void api<Row[] | { items: Row[]; total: number }>(
      `admin/${section}?limit=50&offset=${offset}&q=${encodeURIComponent(search)}`,
    )
      .then((result) => {
        if (active && id === rowsRequest.current) {
          const filtered = Array.isArray(result)
            ? result.filter((r) =>
                Object.values(r).some(
                  (v) => typeof v === 'string' && v.toLowerCase().includes(search.toLowerCase()),
                ),
              )
            : [];
          setRows(Array.isArray(result) ? filtered.slice(offset, offset + 50) : result.items);
          setTotal(Array.isArray(result) ? filtered.length : result.total);
          setLoadedKey(queryKey);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [actor, section, offset, search, queryKey]);
  useEffect(() => {
    if (!job || job.status === 'complete' || job.status === 'failed') return;
    const timer = setInterval(() => {
      void api<Row>(`admin/jobs/${job.id}`)
        .then(setJob)
        .catch((e) => setError(e.message));
    }, 2000);
    return () => clearInterval(timer);
  }, [job]);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const f = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/v1/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json({ email: f.get('email'), password: f.get('password') }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.message || 'Sign in failed');
      const nextActor = await api<Row>('admin/me');
      setActor(nextActor);
      router.push(nextActor.mustChangePassword ? '/admin/change-password' : '/admin');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function password(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const f = new FormData(event.currentTarget);
    try {
      await api('admin/password', {
        method: 'POST',
        body: json({
          currentPassword: f.get('currentPassword'),
          newPassword: f.get('newPassword'),
        }),
      });
      setActor(await api<Row>('admin/me'));
      router.push('/admin');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (section === 'login' || section === 'change-password' || (authReady && !actor))
    return (
      <main className="live-login">
        <Brand />
        <section className="legal-card">
          <h1>
            {section === 'change-password' ? 'Change temporary password' : 'Workspace sign in'}
          </h1>
          <form onSubmit={section === 'change-password' ? password : login}>
            {section === 'change-password' ? (
              <>
                <label>
                  Current password
                  <input
                    name="currentPassword"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </label>
                <label>
                  New password
                  <input
                    name="newPassword"
                    type="password"
                    minLength={12}
                    required
                    autoComplete="new-password"
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Email
                  <input type="email" name="email" required autoComplete="username" />
                </label>
                <label>
                  Password
                  <input type="password" name="password" required autoComplete="current-password" />
                </label>
              </>
            )}
            <button className="button" disabled={busy}>
              {busy
                ? 'Please wait…'
                : section === 'change-password'
                  ? 'Change password'
                  : 'Sign in'}
            </button>
          </form>
          {error && <p role="alert">{error}</p>}
        </section>
        <Link href="/bn">Open patient site</Link>
      </main>
    );
  if (!authReady)
    return (
      <main className="page">
        <p role="status">Checking your session…</p>
      </main>
    );
  const options = (module: string, key = 'name_en') =>
    (choices[module] || []).map((r) => ({
      value: s(r, 'id'),
      label: s(r, key) || s(r, 'name') || s(r, 'email'),
    }));
  const fields: Record<string, Field[]> = {
    medicines: [
      ...nameFields,
      { key: 'slug', label: 'Public URL name' },
      { key: 'genericEn', label: 'Generic name in English' },
      { key: 'genericBn', label: 'Generic name in Bengali', optional: true },
      { key: 'strength', label: 'Strength', optional: true },
      { key: 'form', label: 'Dosage form', optional: true },
      { key: 'category', label: 'Category', optional: true },
      { key: 'descriptionEn', label: 'Description in English', type: 'textarea', optional: true },
      { key: 'descriptionBn', label: 'Description in Bengali', type: 'textarea', optional: true },
      {
        key: 'overrideReason',
        label: 'Duplicate override reason',
        type: 'textarea',
        optional: true,
      },
    ],
    pharmacies: [
      ...nameFields,
      { key: 'addressEn', label: 'Address in English' },
      { key: 'addressBn', label: 'Address in Bengali', optional: true },
      {
        key: 'localityId',
        label: 'Area',
        options: options('areas'),
      },
      { key: 'latitude', label: 'Entrance latitude', type: 'number' },
      { key: 'longitude', label: 'Entrance longitude', type: 'number' },
      { key: 'phone', label: 'Phone', optional: true },
      { key: 'hours', label: 'Opening hours', optional: true },
      {
        key: 'overrideReason',
        label: 'Duplicate override reason',
        type: 'textarea',
        optional: true,
      },
    ],
    doctors: [...nameFields, { key: 'specialty', label: 'Specialty', optional: true }],
    chambers: [
      ...nameFields,
      { key: 'doctorId', label: 'Doctor', options: options('doctors') },
      {
        key: 'localityId',
        label: 'Area',
        options: options('areas'),
      },
      { key: 'addressEn', label: 'Address', optional: true },
      { key: 'latitude', label: 'Latitude (optional)', type: 'number', optional: true },
      { key: 'longitude', label: 'Longitude (optional)', type: 'number', optional: true },
    ],
    mappings: [
      { key: 'medicineId', label: 'Medicine', options: options('medicines') },
      { key: 'pharmacyId', label: 'Pharmacy', options: options('pharmacies') },
      {
        key: 'stockStatus',
        label: 'Optional stock information',
        optional: true,
        options: [
          { value: 'unknown', label: 'Unknown' },
          { value: 'available', label: 'Company reports available' },
          { value: 'low', label: 'Company reports low' },
        ],
      },
      { key: 'active', label: 'Active mapping', type: 'checkbox' },
    ],
    areas: [],
    qrs: [
      { key: 'medicineId', label: 'Medicine', options: options('medicines') },
      {
        key: 'doctorId',
        label: 'Referring doctor (optional)',
        options: options('doctors'),
        optional: true,
      },
      {
        key: 'chamberId',
        label: 'Doctor’s chamber (optional)',
        options: options('chambers').filter(
          (o) =>
            !form.doctorId ||
            (choices.chambers || []).find((r) => r.id === o.value)?.doctor_id === form.doctorId,
        ),
        optional: true,
      },
    ],
    users: editing
      ? [
          { key: 'active', label: 'Account enabled', type: 'checkbox' },
          {
            key: 'roleIds',
            label: 'Assigned roles',
            type: 'multi',
            options: options('roles', 'name'),
          },
        ]
      : [
          { key: 'name', label: 'Full name' },
          { key: 'email', label: 'Email', type: 'email' },
          {
            key: 'roleIds',
            label: 'Assigned roles',
            type: 'multi',
            options: options('roles', 'name'),
          },
        ],
    roles: [
      { key: 'name', label: 'Role name' },
      {
        key: 'permissions',
        label: 'Permissions',
        type: 'multi',
        options: ['*', ...permissions].map((value) => ({
          value,
          label: value === '*' ? 'All permissions (administrator)' : value,
        })),
      },
      {
        key: 'managementScope',
        label: 'Management scope',
        options: [
          { value: 'company', label: 'Company-wide' },
          { value: 'areas', label: 'Granted areas' },
        ],
      },
      {
        key: 'analyticsScope',
        label: 'Analytics scope (independent)',
        options: [
          { value: 'company', label: 'Company-wide' },
          { value: 'areas', label: 'Granted areas' },
        ],
      },
      { key: 'areaIds', label: 'Granted area roots', type: 'multi', options: options('areas') },
    ],
  };
  async function edit(row?: Row) {
    if (section === 'areas') {
      setBoundary(row || {});
      return;
    }
    if (
      !row &&
      (section === 'pharmacies' ||
        (section === 'medicines' && allowed('mappings.write') && allowed('pharmacies.read')))
    ) {
      setWizard(section === 'pharmacies' ? 'pharmacy' : 'medicine');
      return;
    }
    setEditing(row);
    setError('');
    setNotice('');
    const need: Record<string, string[]> = {
      pharmacies: ['areas'],
      chambers: ['doctors', 'areas'],
      mappings: ['medicines', 'pharmacies'],
      qrs: ['medicines', 'doctors', 'chambers'],
      users: ['roles'],
      roles: ['areas'],
      areas: ['areas'],
    };
    const loaded: Record<string, Row[]> = {};
    for (const feature of need[section] || [])
      try {
        loaded[feature] = await allRows(feature);
      } catch {
        loaded[feature] = [];
      }
    setChoices(loaded);
    const snake: Record<string, string> = {
      nameEn: 'name_en',
      nameBn: 'name_bn',
      genericEn: 'generic_en',
      genericBn: 'generic_bn',
      addressEn: 'address_en',
      addressBn: 'address_bn',
      localityId: 'locality_id',
      doctorId: 'doctor_id',
      chamberId: 'chamber_id',
      medicineId: 'medicine_id',
      pharmacyId: 'pharmacy_id',
      stockStatus: 'stock_status',
      descriptionEn: 'description_en',
      descriptionBn: 'description_bn',
      parentId: 'parent_id',
      managementScope: 'management_scope',
      analyticsScope: 'analytics_scope',
      areaIds: 'area_ids',
      roleIds: 'role_ids',
      overrideReason: 'duplicate_override_reason',
    };
    const initial: Record<string, unknown> = {
      active: true,
      managementScope: 'areas',
      analyticsScope: 'areas',
      permissions: [],
      areaIds: [],
      roleIds: [],
    };
    for (const f of fields[section] || [])
      initial[f.key] = row?.[snake[f.key] || f.key] ?? initial[f.key] ?? '';
    setForm(initial);
    setOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const input: Row = {};
      for (const f of fields[section] || []) {
        const value = form[f.key];
        if (f.type === 'multi') input[f.key] = value || [];
        else if (f.type === 'checkbox') input[f.key] = !!value;
        else if (value !== '' && value !== undefined) input[f.key] = value;
      }
      if (section === 'pharmacies' || section === 'chambers') {
        delete input.latitude;
        delete input.longitude;
        if (form.latitude !== '' && form.longitude !== '')
          input.location = { latitude: Number(form.latitude), longitude: Number(form.longitude) };
      }
      if (section === 'areas') input.parentId = input.parentId || null;
      if (section === 'mappings') input.stockStatus = input.stockStatus || null;
      if (editing && section !== 'users') input.revision = editing.revision;
      const saved = await api<Row>(`admin/${section}${editing ? '/' + editing.id : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        body: json(input),
      });
      setOpen(false);
      if (section === 'qrs' && !editing) setPreviewQrId(String(saved.id));
      setNotice(
        saved.temporaryPassword
          ? `Temporary password (shown once): ${saved.temporaryPassword}`
          : 'Saved successfully.',
      );
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm(row: Row, verb: string) {
    setError('');
    if (verb === 'archive') {
      try {
        const impact = await api<Row>(`admin/${section}/${row.id}/impact`);
        setConfirmation({ row, verb, impact });
      } catch (e) {
        setError((e as Error).message);
      }
    } else setConfirmation({ row, verb });
  }
  async function action(row: Row, verb: string) {
    setBusy(true);
    setError('');
    try {
      if (verb === 'reset') {
        const r = await api<{ temporaryPassword: string }>(`admin/users/${row.id}/reset`, {
          method: 'POST',
          body: '{}',
        });
        setNotice(`Temporary password (shown once): ${r.temporaryPassword}`);
      } else if (verb === 'print') {
        const next = await api<Row>('admin/qrs/print', {
          method: 'POST',
          body: json({ qrIds: [row.id], format: 'card' }),
        });
        setJob(next);
      } else if (verb === 'toggle')
        await api(`admin/qrs/${row.id}`, {
          method: 'PATCH',
          body: json({ active: !row.active, revision: row.revision }),
        });
      else
        await api(`admin/${section}/${row.id}/${verb}`, {
          method: 'POST',
          body: json({ revision: row.revision }),
        });
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function analyticsLoad() {
    setBusy(true);
    setError('');
    try {
      setReport(
        await api<Row>(
          `admin/analytics/${dimension === 'summary' ? 'summary' : 'tables'}?from=${from}&to=${to}&dimension=${dimension === 'summary' ? 'medicine' : dimension}`,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function printSheet() {
    setError('');
    try {
      setJob(
        await api<Row>('admin/qrs/print', {
          method: 'POST',
          body: json({ qrIds: selectedQrs, format: 'a4' }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function uploadProduct(file: File) {
    if (!editing) return;
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      body.set('file', file);
      const uploaded = await api<{ id: string }>('admin/images', { method: 'POST', body });
      const next = await api<Row>(`admin/medicines/${editing.id}/image`, {
        method: 'POST',
        body: json({ fileId: uploaded.id, revision: editing.revision }),
      });
      setEditing({ ...editing, ...next });
      setNotice('Product image saved.');
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await fetch('/api/v1/auth/sign-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    setActor(undefined);
    router.push('/admin/login');
  }
  const display = (r: Row) =>
    s(r, 'name_en') ||
    s(r, 'name') ||
    s(r, 'email') ||
    (section === 'mappings' ? s(r, 'medicine_name') : s(r, 'id'));
  return (
    <div className="live-admin">
      <aside className="live-admin-sidebar">
        <Link href="/admin">
          <Brand />
        </Link>
        {/* <small>Medicine locator workspace</small> */}
        <nav>
          <Link className={!section ? 'active' : ''} href="/admin">
            Overview
          </Link>
          {modules
            .filter((m) => allowed(`${m}.read`))
            .map((m) => (
              <Link className={section === m ? 'active' : ''} key={m} href={`/admin/${m}`}>
                {titles[m]}
              </Link>
            ))}
        </nav>
        <Link href="/bn">Open patient site ↗</Link>
        <button className="text-link" onClick={() => void logout()}>
          Sign out
        </button>
      </aside>
      <main className="live-admin-content">
        <div className="admin-page-heading">
          <div>
            {/* <span className="eyebrow">WORKSPACE</span> */}
            <h1>{titles[section] || 'Overview'}</h1>
          </div>
          {fields[section] && allowed(`${section}.write`) && (
            <button className="button" disabled={busy} onClick={() => void edit()}>
              Add{' '}
              {section === 'qrs'
                ? 'QR card'
                : section === 'pharmacies'
                  ? 'pharmacy'
                  : section.slice(0, -1)}
            </button>
          )}
        </div>
        {notice && (
          <div className="info-banner" role="status">
            <p>{notice}</p>
            <button className="text-link" onClick={() => setNotice('')}>
              Dismiss
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="live-error">
            {error}
          </p>
        )}
        {busy && <p role="status">Working…</p>}
        {!section && (
          <div className="live-admin-overview mt-5">
            {/* <h2>Manage the pharmacy finder</h2> */}
            {/* <p>
              Add a medicine, select its pharmacies, and publish—all in one guided flow. New
              pharmacies only need their details and an entrance pin on the map.
            </p> */}
            {allowed('medicines.write') &&
              allowed('mappings.write') &&
              allowed('pharmacies.read') && (
                <button className="button" onClick={() => setWizard('medicine')}>
                  Add medicine & pharmacies
                </button>
              )}
            <div className="how-grid mt-10">
              {modules
                .filter((m) => allowed(`${m}.read`))
                .map((m) => (
                  <Link className="legal-card" href={`/admin/${m}`} key={m}>
                    <h3>{titles[m]}</h3>
                    <p>Open {titles[m].toLowerCase()} →</p>
                  </Link>
                ))}
            </div>
          </div>
        )}
        {section === 'analytics' ? (
          <section>
            <div className="live-report-controls">
              <label>
                From
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                To
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
              <label>
                Breakdown
                <select value={dimension} onChange={(e) => setDimension(e.target.value)}>
                  {['summary', 'medicine', 'pharmacy', 'doctor'].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <button className="button" onClick={() => void analyticsLoad()}>
                Load report
              </button>
            </div>
            <p className="muted">
              Counts represent browser interactions. Direction requests are not pharmacy visits.
            </p>
            {report && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Type</th>
                      <th>Resource</th>
                      <th>Interactions</th>
                      <th>Daily unique browsers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.items as Row[]).map((r, i) => (
                      <tr key={i}>
                        <td>{s(r, 'local_date').slice(0, 10)}</td>
                        <td>{s(r, 'type')}</td>
                        <td>{s(r, 'dimension_name') || 'All in scope'}</td>
                        <td>{s(r, 'interactions')}</td>
                        <td>{s(r, 'unique_browsers')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {report &&
              Array.isArray(report.deidentifiedDailyTotals) &&
              report.deidentifiedDailyTotals.length > 0 && (
                <section>
                  <h3>Historical deidentified daily totals</h3>
                  <p className="small muted">
                    Preserved totals; shown separately from the retained-event table above.
                  </p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Interaction</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(report.deidentifiedDailyTotals as Row[]).map((r, i) => (
                          <tr key={i}>
                            <td>{s(r, 'local_date').slice(0, 10)}</td>
                            <td>{s(r, 'type')}</td>
                            <td>{s(r, 'interactions')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
          </section>
        ) : (
          section && (
            <>
              <div className="live-admin-tools">
                {section === 'qrs' && (
                  <button
                    className="button"
                    disabled={!selectedQrs.length}
                    onClick={() => void printSheet()}
                  >
                    Print selected A4 sheet ({selectedQrs.length}/20)
                  </button>
                )}
                <label>
                  Search
                  <input
                    value={search}
                    onChange={(e) => {
                      setOffset(0);
                      setSearch(e.target.value);
                    }}
                    placeholder="Search names"
                  />
                </label>
                <button className="button button-outline" onClick={() => void reload()}>
                  Refresh
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name / identity</th>
                      <th>Details</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loadedKey === queryKey ? rows : []).map((r) => (
                      <tr key={s(r, 'id')}>
                        <td>
                          {section === 'qrs' && (
                            <input
                              type="checkbox"
                              aria-label={`Select ${display(r)}`}
                              checked={selectedQrs.includes(s(r, 'id'))}
                              disabled={
                                !selectedQrs.includes(s(r, 'id')) && selectedQrs.length >= 20
                              }
                              onChange={(e) =>
                                setSelectedQrs(
                                  e.target.checked
                                    ? [...selectedQrs, s(r, 'id')]
                                    : selectedQrs.filter((id) => id !== r.id),
                                )
                              }
                            />
                          )}
                          <strong>{display(r)}</strong>
                          {section === 'qrs' && (
                            <>
                              <br />
                              <Link href={`/q/${r.token}`} target="_blank" rel="noreferrer">
                                Open QR destination ↗
                              </Link>
                            </>
                          )}
                        </td>
                        <td>
                          {s(r, 'generic_en') ||
                            s(r, 'address_en') ||
                            s(r, 'specialty') ||
                            (section === 'areas'
                              ? r.geometry
                                ? 'Boundary configured'
                                : 'Boundary needed'
                              : s(r, 'type')) ||
                            s(r, 'pharmacy_name') ||
                            s(r, 'stock_status') ||
                            s(r, 'email')}
                          <small>{r.revision ? `Revision ${r.revision}` : ''}</small>
                        </td>
                        <td>
                          {r.archived_at
                            ? 'Archived'
                            : r.publication_state
                              ? s(r, 'publication_state')
                              : r.active === false
                                ? 'Inactive'
                                : 'Active'}
                        </td>
                        <td>
                          <div className="live-row-actions">
                            {section === 'medicines' &&
                              !r.archived_at &&
                              allowed('mappings.read') &&
                              allowed('mappings.write') &&
                              allowed('pharmacies.read') && (
                                <button onClick={() => setMappingMedicine(r)}>
                                  Add pharmacies
                                </button>
                              )}
                            {allowed(`${section}.write`) && !['qrs', 'areas'].includes(section) && (
                              <button onClick={() => void edit(r)}>Edit</button>
                            )}
                            {allowed(`${section}.write`) &&
                              ['medicines', 'pharmacies', 'doctors', 'chambers'].includes(
                                section,
                              ) && (
                                <button
                                  onClick={() =>
                                    void confirm(r, r.archived_at ? 'restore' : 'archive')
                                  }
                                >
                                  {r.archived_at ? 'Restore' : 'Archive'}
                                </button>
                              )}
                            {section === 'medicines' &&
                              allowed('medicines.write') &&
                              !r.archived_at && (
                                <button
                                  onClick={() =>
                                    void action(
                                      r,
                                      r.publication_state === 'published' ? 'unpublish' : 'publish',
                                    )
                                  }
                                >
                                  {r.publication_state === 'published' ? 'Unpublish' : 'Publish'}
                                </button>
                              )}
                            {section === 'areas' && allowed('areas.write') && (
                              <button onClick={() => setBoundary(r)}>Edit boundary</button>
                            )}
                            {section === 'qrs' && (
                              <>
                                <button onClick={() => setPreviewQrId(s(r, 'id'))}>
                                  Preview / print card
                                </button>
                                {allowed('qrs.write') && (
                                  <button onClick={() => void confirm(r, 'toggle')}>
                                    {r.active ? 'Deactivate' : 'Reactivate'}
                                  </button>
                                )}
                              </>
                            )}
                            {section === 'users' && allowed('users.write') && (
                              <button onClick={() => void confirm(r, 'reset')}>
                                Reset password
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && !busy && loadedKey === queryKey && (
                  <p className="empty">No records in your permitted scope.</p>
                )}
              </div>
              {total > 50 && (
                <div className="live-admin-tools">
                  <button disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 50))}>
                    Previous
                  </button>
                  <span>
                    {offset + 1}–{Math.min(offset + 50, total)} / {total}
                  </span>
                  <button disabled={offset + 50 >= total} onClick={() => setOffset(offset + 50)}>
                    Next
                  </button>
                </div>
              )}
            </>
          )
        )}
        {section === 'qrs' && previewQrId && (
          <QRCardPreview
            key={previewQrId}
            qrId={previewQrId}
            onClose={() => setPreviewQrId(undefined)}
          />
        )}
        {job && (
          <div className="info-banner">
            <span>QR card: {s(job, 'status')}</span>
            {!!job.file_id && (
              <a className="button" href={`/api/v1/admin/files/${job.file_id}`}>
                Download PDF
              </a>
            )}
          </div>
        )}
        {mappingMedicine && (
          <MedicinePharmacies
            key={s(mappingMedicine, 'id')}
            medicineId={s(mappingMedicine, 'id')}
            medicineName={s(mappingMedicine, 'name_en')}
            onClose={() => setMappingMedicine(undefined)}
            onSaved={() => {
              setMappingMedicine(undefined);
              setNotice('Pharmacy locations added successfully.');
              void reload();
            }}
          />
        )}
        {wizard && (
          <SetupWizard
            mode={wizard}
            canCreatePharmacy={!!allowed('pharmacies.write')}
            onClose={() => setWizard(undefined)}
            onSaved={() => {
              setWizard(undefined);
              setNotice('Saved successfully. Pharmacy locations and medicine links are ready.');
              void reload();
            }}
          />
        )}
        <Modal
          open={open}
          onOpenChange={setOpen}
          title={`${editing ? 'Edit' : 'Add'} ${titles[section] || 'record'}`}
        >
          <form className="live-record-form" onSubmit={save}>
            {section === 'pharmacies' && (
              <EntrancePicker
                latitude={form.latitude}
                longitude={form.longitude}
                geometry={choices.areas?.find((area) => area.id === form.localityId)?.geometry}
                onPick={({ latitude, longitude }) =>
                  setForm((current) => ({
                    ...current,
                    latitude: latitude.toFixed(7),
                    longitude: longitude.toFixed(7),
                  }))
                }
              />
            )}
            {(fields[section] || []).map((f) => (
              <label key={f.key}>
                {f.label}
                {f.optional ? ' (optional)' : ''}
                {f.type === 'textarea' ? (
                  <textarea
                    value={String(form[f.key] || '')}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                ) : f.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={!!form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                  />
                ) : f.type === 'multi' ? (
                  <select
                    multiple
                    value={(form[f.key] as string[]) || []}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [f.key]: Array.from(e.target.selectedOptions).map((o) => o.value),
                      })
                    }
                  >
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.options ? (
                  <select
                    required={!f.optional}
                    disabled={
                      section === 'mappings' &&
                      !!editing &&
                      (f.key === 'medicineId' || f.key === 'pharmacyId')
                    }
                    value={String(form[f.key] || '')}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  >
                    <option value="">Choose…</option>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required={!f.optional}
                    type={f.type || 'text'}
                    step={f.type === 'number' ? 'any' : undefined}
                    value={String(form[f.key] ?? '')}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                )}
              </label>
            ))}
            {section === 'medicines' && editing && allowed('files.write') && (
              <label>
                Product image (PNG/JPEG/WebP)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadProduct(file);
                  }}
                />
              </label>
            )}
            {error && <p role="alert">{error}</p>}
            <button className="button" disabled={busy}>
              Save
            </button>
          </form>
        </Modal>
        <Modal
          open={!!confirmation}
          onOpenChange={(v) => {
            if (!v) setConfirmation(undefined);
          }}
          title="Review change"
        >
          {confirmation && (
            <>
              <h3>{display(confirmation.row)}</h3>
              <p>
                {confirmation.verb === 'archive'
                  ? 'Archiving makes this record unavailable to the public. Related medicines may be unpublished and linked QR destinations may become unavailable. Restoring will not automatically publish medicines or reactivate QR cards.'
                  : confirmation.verb === 'reset'
                    ? 'Existing sessions remain active. New sessions using the issued temporary password must change it first.'
                    : 'Confirm this status change.'}
              </p>
              {!!confirmation.impact?.medicines && (
                <ul>
                  {(confirmation.impact.medicines as Row[]).map((m) => (
                    <li key={s(m, 'id')}>{s(m, 'name_en')}</li>
                  ))}
                </ul>
              )}
              {confirmation.impact?.qrCount !== undefined && (
                <p>{s(confirmation.impact, 'qrCount')} active QR cards affected</p>
              )}
              <button
                className="button"
                onClick={() => {
                  const c = confirmation;
                  setConfirmation(undefined);
                  void action(c.row, c.verb);
                }}
              >
                Confirm change
              </button>
            </>
          )}
        </Modal>
        {boundary && (
          <BoundaryWorkbench
            area={boundary}
            onClose={() => {
              setBoundary(undefined);
              void reload();
            }}
          />
        )}
      </main>
    </div>
  );
}
