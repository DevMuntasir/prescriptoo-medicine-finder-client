'use client';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Pill,
  Store,
  QrCode,
  MapPin,
  ScanLine,
  Eye,
  MousePointer2,
  Navigation,
  CalendarDays,
  Info,
} from 'lucide-react';
import { useState } from 'react';
import { useDemo } from '@/mocks/provider';
import { Badge, Empty } from '@/components/ui/primitives';
const metrics = [
  {
    label: 'QR landings',
    value: '1,248',
    icon: ScanLine,
    note: 'Page landings, not verified scans',
  },
  { label: 'Medicine views', value: '3,862', icon: Eye, note: 'Views, not distinct patients' },
  {
    label: 'Pharmacy selections',
    value: '946',
    icon: MousePointer2,
    note: 'Interactions, not pharmacy visits',
  },
  {
    label: 'Route requests',
    value: '612',
    icon: Navigation,
    note: 'Requests, not visits or purchases',
  },
];
export function Dashboard() {
  const { medicines, records, persona } = useDemo();
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">YOUR WORKSPACE AT A GLANCE</span>
          <h1>A clearer view of care.</h1>
          <p>Manage your catalogue and keep your pharmacy network connected.</p>
        </div>
        <Badge tone="teal">Synthetic company data</Badge>
      </div>
      <div className="stat-grid">
        {[
          {
            label: 'Published medicines',
            value: medicines.filter((m) => m.status === 'Published').length,
            icon: Pill,
            note: '2 sample entries need attention',
          },
          {
            label: 'Active pharmacies',
            value: records.pharmacies.filter((r) => r.status === 'Active').length,
            icon: Store,
            note: 'Across 4 sample localities',
          },
          {
            label: 'Active QR cards',
            value: records.qrs.filter((r) => r.status === 'Active').length,
            icon: QrCode,
            note: 'Card identity is immutable',
          },
          {
            label: 'Launch localities',
            value: records.areas.length,
            icon: MapPin,
            note: 'Illustrative boundaries only',
          },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <div>
              <span>{s.label}</span>
              <s.icon size={20} />
            </div>
            <strong>{s.value.toString().padStart(2, '0')}</strong>
            <p>{s.note}</p>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Patient interactions</h2>
              <p>Synthetic activity · last 7 sample days</p>
            </div>
            <Link className="text-link" href="/admin/analytics">
              View analytics
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="chart-legend">
            <span className="legend-dot teal" />
            Medicine views
            <span className="legend-dot pale" />
            QR landings
          </div>
          <div className="bar-chart">
            {[42, 65, 51, 82, 60, 95, 73].map((v, i) => (
              <div className="chart-column" key={i}>
                <div className="bar-pair">
                  <span style={{ height: `${v}%` }} />
                  <span style={{ height: `${v * 0.54}%` }} />
                </div>
                <small>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}</small>
              </div>
            ))}
          </div>
          <div className="chart-caption">
            <Info size={14} />
            Illustrative counts. A route request is not a visit.
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Your next steps</h2>
              <p>Keep the sample launch data tidy</p>
            </div>
            <Badge>3 items</Badge>
          </div>
          {[
            {
              title: 'Complete medicine details',
              copy: 'Review bilingual content and draft entries',
              href: '/admin/medicines',
              icon: Pill,
            },
            {
              title: 'Review pharmacy entrances',
              copy: 'Check pins before functional launch',
              href: '/admin/pharmacies',
              icon: MapPin,
            },
            {
              title: 'Preview referral cards',
              copy: 'Review print layouts and card identities',
              href: '/admin/qrs',
              icon: QrCode,
            },
          ].map((s) => (
            <Link className="next-step" href={s.href} key={s.title}>
              <span className="next-icon">
                <s.icon size={20} />
              </span>
              <div>
                <strong>{s.title}</strong>
                <small>{s.copy}</small>
              </div>
              <ArrowRight size={17} />
            </Link>
          ))}
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Catalogue snapshot</h2>
            <p>
              {persona === 'Area manager'
                ? 'Dhanmondi persona preview'
                : 'Company A · synthetic medicines'}
            </p>
          </div>
          <Link className="text-link" href="/admin/medicines">
            Manage catalogue
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Form / strength</th>
                <th>Mapped pharmacies</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {medicines.slice(0, 4).map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.name}</strong>
                    <small>{m.generic}</small>
                  </td>
                  <td>
                    {m.form} · {m.strength}
                  </td>
                  <td>{m.pharmacies} sample mappings</td>
                  <td>
                    <Badge tone="teal">{m.status}</Badge>
                  </td>
                  <td>
                    <Link href={`/admin/medicines/${m.id}`} aria-label={`Edit ${m.name}`}>
                      <ArrowUpRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
export function Analytics() {
  const [range, setRange] = useState('Last 7 sample days');
  const [dimension, setDimension] = useState('Medicines');
  const [state, setState] = useState('Ready');
  const { medicines, records } = useDemo();
  const factor = range === 'Last 30 sample days' ? 3 : range === 'Today (sample)' ? 0.2 : 1;
  const names =
    dimension === 'Medicines'
      ? medicines.filter((m) => m.status === 'Published').map((m) => m.name)
      : dimension === 'Doctors'
        ? records.doctors.map((r) => r.name)
        : records.pharmacies.map((r) => r.name);
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">BASIC ANALYTICS</span>
          <h1>Understand the next step.</h1>
          <p>Separate interactions, with clear definitions. All figures are synthetic.</p>
        </div>
        <Badge tone="amber">No patient or visit counts</Badge>
      </div>
      <div className="filter-bar">
        <label>
          <CalendarDays size={17} />
          <select
            aria-label="Analytics sample date range"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option>Last 7 sample days</option>
            <option>Last 30 sample days</option>
            <option>Today (sample)</option>
          </select>
        </label>
        <span className="muted small">Reporting timezone: Asia/Dhaka</span>
        <label className="scenario-control">
          Preview
          <select
            aria-label="Analytics preview state"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option>Ready</option>
            <option>Empty</option>
            <option>Error</option>
            <option>Denied</option>
          </select>
        </label>
      </div>
      {state !== 'Ready' ? (
        <Empty
          title={
            state === 'Empty'
              ? 'No interactions in this sample window.'
              : state === 'Denied'
                ? 'Analytics permission is required.'
                : 'The sample summary couldn’t load.'
          }
        >
          <button className="button button-outline" onClick={() => setState('Ready')}>
            Reset preview
          </button>
        </Empty>
      ) : (
        <>
          <div className="stat-grid">
            {metrics.map((m) => (
              <div className="stat-card" key={m.label}>
                <div>
                  <span>{m.label}</span>
                  <m.icon size={20} />
                </div>
                <strong>
                  {Math.round(Number(m.value.replace(',', '')) * factor).toLocaleString('en')}
                </strong>
                <p>{m.note}</p>
              </div>
            ))}
          </div>
          <div className="info-banner">
            <Info size={20} />
            <p>
              Unique browsers: <strong>{Math.round(428 * factor)}</strong> in this sample period.
              These represent browsers, not people. QR landings are recorded after page landing in
              functional R1; latest-QR attribution and midnight reset are backend work.
            </p>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Interactions by {dimension.toLowerCase()}</h2>
                <p>Source attribution and actual viewed medicine are distinct.</p>
              </div>
              <div className="segmented">
                {['Medicines', 'Doctors', 'Pharmacies'].map((d) => (
                  <button
                    key={d}
                    className={dimension === d ? 'active' : ''}
                    onClick={() => setDimension(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{dimension.slice(0, -1)}</th>
                    <th>QR landings</th>
                    <th>Views</th>
                    <th>Selections</th>
                    <th>Route requests</th>
                    <th>Unique browsers</th>
                  </tr>
                </thead>
                <tbody>
                  {names.map((name, i) => (
                    <tr key={name}>
                      <td>
                        <strong>{name}</strong>
                        <small>Synthetic company A record</small>
                      </td>
                      {[160, 520, 130, 85, 95].map((base, k) => (
                        <td key={k}>{Math.round((base * factor) / (i + 1))}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="small muted">
            Heatmaps, exact-origin investigation and report exports belong to R2. Basic analytics
            contains no exact points.
          </p>
        </>
      )}
    </>
  );
}
