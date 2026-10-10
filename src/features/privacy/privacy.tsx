'use client';
import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { api, json } from '@/lib/api';
export function Privacy({ terms = false }: { terms?: boolean }) {
  const locale = useLocale(),
    bn = locale === 'bn';
  const tx = (en: string, b: string) => (bn ? b : en);
  const [allowed, setAllowed] = useState(false),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [request, setRequest] = useState<{ id: string; status: string }>();
  useEffect(() => {
    if (terms) return;
    let active = true;
    api<{ allowed: boolean }>('public/privacy/consent')
      .then((b) => {
        if (active) {
          setAllowed(b.allowed);
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [terms]);
  useEffect(() => {
    if (!request || request.status === 'complete') return;
    let active = true;
    const timer = setInterval(() => {
      void api<{ id: string; status: string }>(`public/privacy/delete/${request.id}`)
        .then((r) => {
          if (active) setRequest(r);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [request]);
  async function consent() {
    setBusy(true);
    setError('');
    try {
      await api('public/privacy/consent', { method: 'POST', body: json({ allowed: !allowed }) });
      setAllowed(!allowed);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError('');
    try {
      setRequest(await api('public/privacy/delete', { method: 'POST', body: '{}' }));
      setAllowed(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page legal-page">
      <Link className="back-link" href={`/${locale}`}>
        {tx('Back to directory', 'তালিকায় ফিরুন')}
      </Link>
      <h1>
        {terms
          ? tx('Terms of use', 'ব্যবহারের শর্ত')
          : tx('Your privacy, your choice', 'আপনার গোপনীয়তা, আপনার পছন্দ')}
      </h1>
      {terms ? (
        <section className="legal-card">
          <p>
            {tx(
              'This directory lists company-managed medicine and pharmacy information. A listing does not guarantee stock or opening hours. Confirm availability directly with the pharmacy.',
              'এই তালিকায় কোম্পানির দেওয়া ওষুধ ও ফার্মেসির তথ্য রয়েছে। মজুত বা দোকান খোলা থাকার নিশ্চয়তা নেই। দোকানে নিশ্চিত করুন।',
            )}
          </p>
          <p>
            {tx(
              'Maps and turn-by-turn routes use Google Maps Platform when configured. Route times and walking coverage are estimates, not guarantees.',
              'কনফিগার করা থাকলে মানচিত্র ও ধাপে ধাপে পথ Google Maps Platform ব্যবহার করে। পথের সময় ও হাঁটার কভারেজ আনুমানিক, নিশ্চিত নয়।',
            )}
          </p>
          <Link href={`/${locale}/privacy`}>{tx('Privacy choices', 'গোপনীয়তার পছন্দ')}</Link>
        </section>
      ) : (
        <>
          <section className="legal-card">
            <h2>{tx('Location stays a choice', 'অবস্থান আপনার পছন্দ')}</h2>
            <p>
              {tx(
                'Your starting point is used transiently for nearby search and routing. Exact-location analytics requires separate optional consent. No continuous journey is tracked.',
                'শুরুর স্থান কাছের দোকান ও পথ খোঁজার জন্য সাময়িক ব্যবহৃত হয়। অবস্থান বিশ্লেষণে সংরক্ষণের জন্য আলাদা ঐচ্ছিক সম্মতি লাগে। চলাচলের ধারাবাহিক পথ রেকর্ড করা হয় না।',
              )}
            </p>
            <div className="consent-row">
              <strong>
                {tx('Optional exact-location analytics', 'ঐচ্ছিক সুনির্দিষ্ট অবস্থান বিশ্লেষণ')}
              </strong>
              <button
                className={`switch ${allowed ? 'on' : ''}`}
                role="switch"
                aria-checked={allowed}
                aria-label={tx(
                  'Optional exact-location analytics',
                  'ঐচ্ছিক সুনির্দিষ্ট অবস্থান বিশ্লেষণ',
                )}
                disabled={!ready || busy || !!request}
                onClick={() => void consent()}
              >
                <span />
              </button>
            </div>
            <p>
              {tx(
                'If enabled, individual origin samples expire after at most 90 days. Withdrawal removes existing samples.',
                'সক্রিয় করলে শুরুর স্থান সর্বোচ্চ ৯০ দিন সংরক্ষিত থাকবে। সম্মতি প্রত্যাহার করলে আগের স্থানগুলো মুছে যায়।',
              )}
            </p>
          </section>
          <section className="legal-card">
            <h2>{tx('Browser-based analytics', 'ব্রাউজারভিত্তিক বিশ্লেষণ')}</h2>
            <p>
              {tx(
                'A pseudonymous cookie counts QR landings, medicine views, shop selections and direction requests. Daily unique counts describe browsers, not patients or shop visits. Blocking or clearing cookies changes these counts.',
                'ছদ্মনামযুক্ত cookie দিয়ে QR landing, ওষুধ দেখা, দোকান নির্বাচন ও পথের অনুরোধ গণনা হয়। দৈনিক গণনা ব্রাউজারের, রোগী বা দোকানে যাওয়ার নয়। cookie বন্ধ বা মুছে দিলে গণনা বদলে যায়।',
              )}
            </p>
            <p>
              {tx(
                'Google receives map and route requests, your IP address, the site origin, and the route endpoints needed to provide directions. Medicine and doctor identifiers are not sent. Google’s Terms of Service and Privacy Policy also apply.',
                'মানচিত্র ও পথ দেখাতে Google ম্যাপ/রুট অনুরোধ, আপনার IP ঠিকানা, সাইটের অরিজিন এবং প্রয়োজনীয় শুরু ও গন্তব্য পায়। ওষুধ বা চিকিৎসকের ID পাঠানো হয় না। Google-এর ব্যবহারের শর্ত ও গোপনীয়তা নীতিও প্রযোজ্য।',
              )}
            </p>
            <p>
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
                Google Terms
              </a>{' '}
              ·{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                Google Privacy Policy
              </a>
            </p>
          </section>
          <section className="legal-card">
            <h2>
              {tx(
                'Delete this browser’s identifiable data',
                'এই ব্রাউজারের শনাক্তযোগ্য তথ্য মুছুন',
              )}
            </h2>
            <p>
              {tx(
                'Removes this browser’s events, attribution and exact-location samples across days. Deidentified historical totals remain. Staff exports already downloaded cannot be recalled. The current browser cookie is cleared when deletion completes.',
                'বিভিন্ন দিনের event, QR উৎস ও অবস্থানের নমুনা মুছে যায়। শনাক্ত করা যায় না এমন পুরোনো মোট সংখ্যা থাকে। কর্মীদের আগের download ফেরত নেওয়া যায় না। মুছে ফেলা শেষ হলে এই ব্রাউজারের cookie সরবে।',
              )}
            </p>
            <button
              className="button button-outline"
              disabled={busy || !!request}
              onClick={() => void remove()}
            >
              {tx('Delete my browser data', 'আমার ব্রাউজারের তথ্য মুছুন')}
            </button>
            {request && (
              <p role="status">
                {request.status === 'complete'
                  ? tx('Deletion completed.', 'তথ্য মুছে ফেলা হয়েছে।')
                  : tx('Deletion queued. Checking progress…', 'মুছে ফেলার অনুরোধ জমা হয়েছে…')}
              </p>
            )}
          </section>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
