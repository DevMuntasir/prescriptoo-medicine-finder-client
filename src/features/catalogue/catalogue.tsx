'use client';
import { useState, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, Search, MapPin, Pill, X, QrCode } from 'lucide-react';
import { LandingSections } from './landing-sections';
import { LocationIllustration } from './location-visuals';
import { api, LiveMedicine } from '@/lib/api';
import { Medicine } from '@/contracts';
import './landing.css';

export function MedicineArt({ medicine, large = false }: { medicine: Medicine; large?: boolean }) {
  return (
    <div className={`medicine-art ${medicine.color} ${large ? 'large' : ''}`} aria-hidden="true">
      {medicine.imageFileId ? (
        <Image
          src={`/api/v1/public/images/${medicine.imageFileId}`}
          alt=""
          width={400}
          height={300}
        />
      ) : (
        <div className="medicine-symbol">
          <Pill size={large ? 80 : 48} />
          <span>{medicine.name}</span>
          <small>{medicine.strength}</small>
        </div>
      )}
      <div className="art-shadow" />
    </div>
  );
}

export function Catalogue() {
  const locale = useLocale();
  const bn = locale === 'bn';
  const t = useTranslations();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [retry, setRetry] = useState(0);
  const [motionPaused, setMotionPaused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setOffset(0); }, 220);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    if (!offset) setMedicines([]);
    api<(LiveMedicine & { total: number })[]>(
      `public/medicines?limit=12&offset=${offset}&q=${encodeURIComponent(query)}`,
      { signal: controller.signal },
    )
      .then((rows) => {
        if (controller.signal.aborted) return;
        const items = rows.map((m): Medicine => ({
          id: m.id,
          slug: m.slug,
          name: m.name_en,
          nameBn: m.name_bn,
          generic: m.generic_en,
          genericBn: m.generic_bn,
          strength: m.strength,
          form: m.form,
          category: m.category,
          status: 'Published',
          color: 'mint',
          pharmacies: 0,
          imageFileId: m.image_file_id,
        }));
        setMedicines((prev) => (offset ? [...prev, ...items] : items));
        setTotal(rows[0]?.total ?? 0);
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) { setLoadError(true); setLoading(false); }
      });
    return () => controller.abort();
  }, [query, offset, retry]);

  const clear = () => { setSearch(''); setQuery(''); setOffset(0); };

  return (
    <main className={`acme-landing${motionPaused ? ' motion-paused' : ''}`}>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="acme-hero" aria-labelledby="landing-heading">

        {/* Left copy */}
        <div className="acme-hero-copy">



          {/* Confident, authoritative headline */}
          <h1 id="landing-heading" className="acme-hero-title">
            {bn ? (
              <>
                প্রেসক্রিপশনের ওষুধ,
                <br />
                <span className="acme-highlight">নিকটস্থ সঠিক ফার্মেসিতে।</span>
              </>
            ) : (
              <>
                Prescription medicine,
                <br />
                <span className="acme-highlight">find your way nearby.</span>
              </>
            )}
          </h1>

          {/* Crisp, readable subtitle */}
          <p className="acme-hero-desc">
            {bn
              ? 'ডাক্তারের দেওয়া QR কার্ড স্ক্যান করুন অথবা ওষুধের নাম দিয়ে খুঁজুন। কাছের তালিকাভুক্ত ফার্মেসি বেছে নিয়ে প্রবেশপথের দিকনির্দেশনা নিন।'
              : 'Scan your doctor’s QR card or search by medicine name. Explore listed pharmacies nearby and get directions to the entrance. Contact the pharmacy to confirm stock.'}
          </p>

          {/* High-Affordance Modern Search Box */}
          <div className="acme-search-wrapper">
            <form
              className="acme-search-bar"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                setQuery(search.trim());
                setOffset(0);
                resultsRef.current?.focus({ preventScroll: true });
                resultsRef.current?.scrollIntoView({ block: 'start' });
              }}
            >
              <Search size={20} className="acme-search-icon" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                maxLength={200}
                aria-label={t('search')}
                placeholder={bn ? 'ওষুধ বা জেনেরিক নাম লিখুন…' : 'Enter medicine or generic name…'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="acme-search-clear"
                  aria-label={bn ? 'মুছুন' : 'Clear search'}
                  onClick={() => { clear(); searchRef.current?.focus(); }}
                >
                  <X size={16} />
                </button>
              )}
              <button className="acme-search-btn" type="submit">
                <span>{bn ? 'ওষুধ খুঁজুন' : 'Search'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            {/* Clean Secondary Action Bar: Quick Tags + Scan QR Card Link */}
            <div className="acme-subrow">
              <span className="landing-search-note"><MapPin size={14} />{bn ? 'ওষুধ খুঁজতে লোকেশন প্রয়োজন নেই' : 'No location needed to browse'}</span>
              <a href="#qr-guide" className="acme-qr-trigger"><QrCode size={15} /><span>{bn ? 'QR কার্ড ব্যবহারের নিয়ম' : 'Have a QR card?'}</span></a>
            </div>
          </div>


        </div>

        {/* Right: animated journey preview */}
        <div className="acme-hero-visual" aria-hidden="true">
          <LocationIllustration bn={bn} />
        </div>

      </section>

      <section className="acme-catalogue" id="medicines" ref={resultsRef} tabIndex={-1} aria-labelledby="medicines-heading" aria-busy={loading}>
        <div className="acme-section-heading"><div><h2 id="medicines-heading">{bn ? 'আপনার ওষুধটি খুঁজে নিন' : 'What are you looking for?'}</h2></div><span className="acme-result-count" role="status">{loading ? (bn ? 'লোড হচ্ছে…' : 'Loading…') : (bn ? `${total}টি ওষুধ` : `${total} medicines`)}</span></div>
        {query && <div className="acme-query">{query}<button type="button" onClick={clear} aria-label={bn ? 'মুছুন' : 'Clear search'}><X size={16} /></button></div>}
        {loadError ? <div className="acme-error"><p>{bn ? 'ওষুধের তালিকা লোড করা যায়নি।' : 'The medicine list could not be loaded.'}</p><button type="button" className="story-primary" onClick={() => setRetry(r => r + 1)}>{bn ? 'আবার চেষ্টা করুন' : 'Try again'}</button></div> : <>
          <div className="acme-medicine-grid">{medicines.map((medicine, index) => <Link className={`acme-medicine-card tone-${index % 4}`} href={`/${locale}/medicines/${medicine.slug}`} key={medicine.id}><div className="acme-card-art"><MedicineArt medicine={medicine} /><span className="acme-form">{medicine.form}</span><span className="acme-card-arrow"><ArrowUpRight size={17} /></span></div><div className="acme-card-body"><h3>{bn ? medicine.nameBn || medicine.name : medicine.name}</h3><p>{bn ? medicine.genericBn || medicine.generic : medicine.generic} · {medicine.strength}</p><div className="acme-card-action"><MapPin size={14} />{bn ? 'বিস্তারিত ও ফার্মেসি দেখুন' : 'Details & pharmacy finder'}<ArrowRight size={14} /></div></div></Link>)}</div>
          {loading && <p className="catalogue-status" role="status">{bn ? 'ওষুধের তালিকা লোড হচ্ছে…' : 'Loading the medicine catalogue…'}</p>}
          {!loading && !medicines.length && <p className="acme-error">{bn ? 'কোনো ওষুধ পাওয়া যায়নি। অন্য নাম দিয়ে খুঁজুন।' : 'No medicines found. Try another medicine or generic name.'}</p>}
          {medicines.length < total && <div className="acme-load-more"><button className="story-primary" type="button" disabled={loading} onClick={() => setOffset(medicines.length)}>{bn ? 'আরও ওষুধ দেখুন' : 'Explore more medicines'}<ArrowRight size={16} /></button></div>}
        </>}
      </section>
      <div className="landing-motion-control"><button type="button" aria-pressed={motionPaused} onClick={() => setMotionPaused(value => !value)}>{motionPaused ? (bn ? 'অ্যানিমেশন চালু করুন' : 'Play animations') : (bn ? 'অ্যানিমেশন থামান' : 'Pause animations')}</button></div>
      <LandingSections bn={bn} locale={locale} />

    </main>
  );
}
