'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Printer, Info, QrCode, ArrowUpRight } from 'lucide-react';
import { useDemo } from '@/mocks/provider';
import { Badge } from '@/components/ui/primitives';
export function QRPreview({ id }: { id: string }) {
  const demo = useDemo();
  const record = demo.records.qrs.find((r) => r.id === id);
  const [view, setView] = useState('Single card');
  const [job, setJob] = useState('Ready');
  const referral = id === 'qr-2' || Boolean(record?.metadata?.doctorId);
  const medicine = demo.medicines.find(
    (m) => m.id === (record?.metadata?.medicineId || (id === 'qr-2' ? 'med-2' : 'med-1')),
  );
  const token = ['qr-1', 'qr-2', 'qr-3'].includes(id)
    ? id === 'qr-3'
      ? 'demo-inactive'
      : id === 'qr-2'
        ? 'demo-referral'
        : 'demo-medicine'
    : `demo-card-${id}`;
  return (
    <>
      <div className="no-print">
        <Link className="back-link" href="/admin/qrs">
          <ArrowLeft size={16} />
          Back to QR cards
        </Link>
        <div className="admin-title">
          <div>
            <span className="eyebrow">CARD & PRINT PREVIEW</span>
            <h1>{record?.name || 'Sample card'}</h1>
            <p>Review the layout before production token and PDF generation.</p>
          </div>
          <button className="button" onClick={() => window.print()}>
            <Printer size={17} />
            Print layout preview
          </button>
        </div>
        <div className="filter-bar">
          <div className="segmented">
            {['Single card', 'A4 sheet'].map((v) => (
              <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>
                {v}
              </button>
            ))}
          </div>
          <label className="scenario-control">
            Generation preview
            <select value={job} onChange={(e) => setJob(e.target.value)}>
              <option>Ready</option>
              <option>Queued</option>
              <option>Failed</option>
            </select>
          </label>
          <Badge tone="amber">Layout only · not scannable</Badge>
        </div>
        {job !== 'Ready' && (
          <div role="status" className="warning">
            {job === 'Queued'
              ? 'Sample PDF job queued. No worker is running.'
              : 'Sample generation failed. Production retry/download handling is deferred.'}
            <button className="text-button" onClick={() => setJob('Ready')}>
              Reset preview
            </button>
          </div>
        )}
      </div>
      <div className={view === 'A4 sheet' ? 'a4-sheet' : 'single-card-preview'}>
        {Array.from({ length: view === 'A4 sheet' ? 8 : 1 }, (_, i) => (
          <div className="print-card" key={i}>
            <div className="print-brand">
              prescriptoo<span>+</span>
            </div>
            <div className="print-body">
              <div>
                <span className="eyebrow">A LITTLE CLOSER TO CARE</span>
                <h3>{medicine?.name || 'Sample medicine'}</h3>
                <p>
                  {medicine?.strength} · {medicine?.form}
                </p>
                {referral && (
                  <small>
                    Dr. Sample Rahman
                    <br />
                    Dhanmondi chamber
                  </small>
                )}
                <p className="print-note">
                  Find sample pharmacies.
                  <br />
                  UI preview — not a live card.
                </p>
              </div>
              <div className="qr-placeholder">
                <QrCode size={80} strokeWidth={1.5} />
                <span>DEMO ONLY</span>
              </div>
            </div>
            <div className="print-foot">90 × 50 mm · synthetic identity · not scannable</div>
          </div>
        ))}
      </div>
      <div className="no-print">
        <div className="info-banner">
          <Info size={20} />
          <p>
            Identity: {record?.detail}. This tuple is read-only. Production cards need real opaque
            tokens, quiet zones, authorized downloads and Android/iOS print-scan validation.
          </p>
        </div>
        <Link className="button button-outline" href={`/q/${token}`}>
          Open sample landing
          <ArrowUpRight size={16} />
        </Link>
        <button
          className="button button-outline"
          onClick={() => {
            demo.setRecords((prev) => ({
              ...prev,
              qrs: prev.qrs.map((r) =>
                r.id === id ? { ...r, status: r.status === 'Active' ? 'Inactive' : 'Active' } : r,
              ),
            }));
            demo.notify('Demo QR state updated. Production resolution is unchanged.');
          }}
        >
          {record?.status === 'Active' ? 'Deactivate' : 'Reactivate'} sample card
        </button>
        <p className="small muted">Real PNG/PDF export is functional R1. Report exports are R2.</p>
      </div>
    </>
  );
}
