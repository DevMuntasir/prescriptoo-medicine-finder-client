'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brand } from '@/components/layout/patient-shell';
import { useDemo } from '@/mocks/provider';
import { Persona } from '@/contracts';
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
export function Account({ password = false }: { password?: boolean }) {
  const router = useRouter();
  const { setPersona } = useDemo();
  const [persona, setSelected] = useState<Persona>('Administrator');
  const [value, setValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  return (
    <main className="account-page">
      <div className="account-intro">
        <Brand />
        <span className="eyebrow">THE CARE WORKSPACE</span>
        <h1>
          Good care starts
          <br />
          with good connections.
        </h1>
        <p>
          A thoughtful place to manage your medicines, pharmacy network and the next step in care.
        </p>
        <div>
          <ShieldCheck size={20} />
          UI preview · no real account or credentials
        </div>
      </div>
      <div className="account-form">
        <span className="large-icon">
          <LockKeyhole size={25} />
        </span>
        <h2>{password ? 'Update temporary password' : 'Welcome to your workspace.'}</h2>
        <p className="muted">
          {password
            ? 'Preview a required password-change flow. Enter invented values only.'
            : 'Select a demo persona to explore the admin experience.'}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password && (value.length < 8 || value !== confirm)) {
              setError('Use at least 8 demo characters and matching confirmation.');
              return;
            }
            setPersona(persona);
            router.push(persona === 'Disabled account' ? '/admin' : '/admin');
          }}
        >
          {password ? (
            <>
              <label>
                Demo new password
                <input
                  type="password"
                  autoComplete="off"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                />
              </label>
              <label>
                Confirm demo password
                <input
                  type="password"
                  autoComplete="off"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Demo persona
                <select value={persona} onChange={(e) => setSelected(e.target.value as Persona)}>
                  {['Administrator', 'Area manager', 'Analytics viewer', 'Disabled account'].map(
                    (p) => (
                      <option key={p}>{p}</option>
                    ),
                  )}
                </select>
              </label>
              <div className="info-banner small">
                This is a persona switch, not a login. No email or real password is needed.
              </div>
            </>
          )}
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <button className="button wide">
            {password ? 'Simulate password update' : 'Enter demo workspace'}
            <ArrowRight size={17} />
          </button>
        </form>
        <Link className="text-link" href={password ? '/admin/login' : '/admin/change-password'}>
          {password ? 'Back to demo entry' : 'Preview temporary password change'}
        </Link>
        <Link className="back-link" href="/en">
          Back to patient preview
        </Link>
      </div>
    </main>
  );
}
