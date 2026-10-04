'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Pill,
  Store,
  Link2,
  Stethoscope,
  Map,
  Users,
  ShieldCheck,
  QrCode,
  ChartNoAxesCombined,
  ArrowUpRight,
  RotateCcw,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { ReactNode, useState } from 'react';
import { Brand } from './patient-shell';
import { useDemo } from '@/mocks/provider';
import { Persona } from '@/contracts';
export const adminNav = [
  { slug: '', name: 'Overview', icon: LayoutDashboard },
  { slug: 'medicines', name: 'Medicines', icon: Pill },
  { slug: 'pharmacies', name: 'Pharmacies', icon: Store },
  { slug: 'mappings', name: 'Medicine mappings', icon: Link2 },
  { slug: 'doctors', name: 'Doctors & chambers', icon: Stethoscope },
  { slug: 'areas', name: 'Areas & boundaries', icon: Map },
  { slug: 'qrs', name: 'QR cards', icon: QrCode },
  { slug: 'analytics', name: 'Analytics', icon: ChartNoAxesCombined },
  { slug: 'users', name: 'Team members', icon: Users },
  { slug: 'roles', name: 'Roles & permissions', icon: ShieldCheck },
];
export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { persona, setPersona, reset } = useDemo();
  const [open, setOpen] = useState(false);
  const segment = path.split('/')[2] || '';
  const name = adminNav.find((n) => n.slug === segment)?.name || 'Account';
  return (
    <div className="admin-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Link href="/admin">
            <Brand />
          </Link>
          <button
            className="mobile-menu icon-button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="company-switch">
          <span className="company-avatar">P</span>
          {/* <div>
            <strong>Demo Company A</strong>
            <small>Medicine locator workspace</small>
          </div> */}
          <ChevronDown size={15} />
        </div>
        {/* <span className="nav-label">WORKSPACE</span> */}
        <nav>
          {adminNav.map((n, i) => (
            <Link
              key={n.slug}
              className={`${segment === n.slug ? 'active' : ''} ${i === 8 ? 'nav-separated' : ''}`}
              href={`/admin${n.slug ? '/' + n.slug : ''}`}
              onClick={() => setOpen(false)}
            >
              <n.icon size={19} />
              {n.name}
              {n.slug === 'medicines' && <span className="nav-count">8</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/en">
            <ArrowUpRight size={17} />
            Open patient preview
          </Link>
          <button onClick={reset}>
            <RotateCcw size={16} />
            Reset demo data
          </button>
          <div className="profile">
            <span className="avatar">DA</span>
            <div>
              <strong>Demo administrator</strong>
              <small>UI preview account</small>
            </div>
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="admin-main">
        <header className="admin-header">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="muted">Workspace</span>
            <span className="muted">/</span>
            <strong>{name}</strong>
          </div>
          <label className="persona-control">
            <span>View as</span>
            <select value={persona} onChange={(e) => setPersona(e.target.value as Persona)}>
              {['Administrator', 'Area manager', 'Analytics viewer', 'Disabled account'].map(
                (p) => (
                  <option key={p}>{p}</option>
                ),
              )}
            </select>
          </label>
        </header>
        <div className="admin-demo">
          <span className="demo-dot" />
          <strong>UI preview</strong>
          <span>
            Synthetic data · simulated saves · resets on refresh · role visibility is a demo
          </span>
          <Link href="/admin/login">
            Switch account
            <ArrowUpRight size={13} />
          </Link>
        </div>
        {children}
        <footer className="admin-footer">
          Prescriptoo workspace · UI MVP <span>Demo Company A · Asia/Dhaka</span>
        </footer>
      </div>
    </div>
  );
}
