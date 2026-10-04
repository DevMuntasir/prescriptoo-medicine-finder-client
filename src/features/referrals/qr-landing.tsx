'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { NextIntlClientProvider } from 'next-intl';
import { Brand } from '@/components/layout/patient-shell';
import { LiveLocator } from '@/features/live/locator';
import { api, json, LiveMedicine } from '@/lib/api';
import enMessages from '@/messages/en.json';
import bnMessages from '@/messages/bn.json';
export function QRLanding({ token }: { token: string }) {
  const [locale, setLocale] = useState<'bn' | 'en'>('bn');
  const [medicine, setMedicine] = useState<LiveMedicine>();
  const [qrId, setQrId] = useState('');
  const [error, setError] = useState('');
  const landingId = useRef('');
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const qr = await api<{ id: string; slug: string }>(
          `public/qrs/${encodeURIComponent(token)}`,
        );
        const med = await api<LiveMedicine>(`public/medicines/${qr.slug}`);
        if (!active) return;
        setMedicine(med);
        setQrId(qr.id);
        landingId.current ||= crypto.randomUUID();
        void api('public/qrs/landing', {
          method: 'POST',
          body: json({ eventId: landingId.current, token }),
        }).catch(() => {});
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [token]);
  return (
    <NextIntlClientProvider locale={locale} messages={locale === 'bn' ? bnMessages : enMessages}>
      <div lang={locale} className="qr-finder-shell">
        <header className="qr-finder-header">
          <Link href={`/${locale}`}>
            <Brand />
          </Link>
          <button
            className="language-switch"
            onClick={() => setLocale(locale === 'bn' ? 'en' : 'bn')}
          >
            {locale === 'bn' ? 'English' : 'বাংলা'}
          </button>
        </header>
        {medicine ? (
          <LiveLocator medicine={medicine} qrId={qrId} qrEntry />
        ) : (
          <main className="page">
            <h1>
              {error
                ? locale === 'bn'
                  ? 'এই QR এখন ব্যবহার করা যাচ্ছে না'
                  : 'This QR is unavailable'
                : locale === 'bn'
                  ? 'ওষুধের তথ্য লোড হচ্ছে…'
                  : 'Loading medicine…'}
            </h1>
            {error && (
              <>
                <p role="alert">{error}</p>
                <Link className="button" href={`/${locale}`}>
                  {locale === 'bn' ? 'ওষুধের তালিকা দেখুন' : 'Browse medicines'}
                </Link>
              </>
            )}
          </main>
        )}
        <footer className="live-finder-footer">
          <Link href={`/${locale}/privacy`}>
            {locale === 'bn' ? 'গোপনীয়তার পছন্দ' : 'Privacy choices'}
          </Link>
        </footer>
      </div>
    </NextIntlClientProvider>
  );
}
