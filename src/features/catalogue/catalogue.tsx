'use client';
import { useState, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  MapPin,
  Pill,
  Navigation,
  ScanLine,
  X,
  ShieldCheck,
  Star,
  Clock,
  CheckCircle2,
  Package,
  ChevronRight,
  Footprints,
  QrCode,
  Stethoscope,
  Route,
} from 'lucide-react';
import { api, LiveMedicine } from '@/lib/api';
import { Medicine } from '@/contracts';
import { Badge, Empty } from '@/components/ui/primitives';
import './landing.css';
import { MEDICINES, PHARMACIES } from './mockPharmacies';
import { MapPharmacy, MedicineItem } from './pharmacy';

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

/* ═══════════════════════════════════════════════════════════
   HERO JOURNEY PREVIEW  (right column)
   Shows the 3-step flow: QR scan → medicine → pharmacy + directions
═══════════════════════════════════════════════════════════ */
const PREVIEW_STEPS = [
  {
    id: 'qr',
    icon: <QrCode size={20} />,
    label: 'QR স্ক্যান',
    labelEn: 'Scan QR',
    desc: 'ডাক্তারের কার্ড স্ক্যান করুন',
    descEn: 'Scan your prescription card',
    color: '#f0f4ff',
    accent: '#4f46e5',
  },
  {
    id: 'medicine',
    icon: <Pill size={20} />,
    label: 'ওষুধ',
    labelEn: 'Medicine',
    desc: 'Napa Extra 500mg/65mg',
    descEn: 'Napa Extra 500mg/65mg',
    color: '#fff7ed',
    accent: '#ea580c',
  },
  {
    id: 'route',
    icon: <Route size={20} />,
    label: 'পথ দেখুন',
    labelEn: 'Get directions',
    desc: 'Al-Madina · ৪.৮ km · ১৪ মিনিট',
    descEn: 'Al-Madina · 4.8 km · 14 min',
    color: '#f0fdf4',
    accent: '#16a34a',
  },
];

function JourneyPreview({ bn }: { bn: boolean }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % PREVIEW_STEPS.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="hjp-root" aria-hidden="true">
      {/* Step flow */}
      <div className="hjp-steps">
        {PREVIEW_STEPS.map((step, i) => (
          <div key={step.id} className={`hjp-step ${active === i ? 'hjp-step--active' : ''}`}>
            <div className="hjp-step-connector" />
            <div className="hjp-step-node" style={{ background: step.color, color: step.accent }}>
              {step.icon}
            </div>
            <div className="hjp-step-body">
              <span className="hjp-step-label">{bn ? step.label : step.labelEn}</span>
              <span className="hjp-step-desc">{bn ? step.desc : step.descEn}</span>
            </div>
            {active === i && <CheckCircle2 size={15} className="hjp-step-check" />}
          </div>
        ))}
      </div>

      {/* Active content card */}
      {active === 0 && (
        <div className="hjp-card hjp-card-qr">
          <div className="hjp-qr-icon">
            <QrCode size={52} />
          </div>
          <div className="hjp-qr-lines">
            <div className="hjp-qr-line hjp-qr-line--scan" />
          </div>
          <div className="hjp-card-label">
            <Stethoscope size={13} />
            {bn ? 'ডাক্তারের কার্ড' : "Doctor's prescription card"}
          </div>
        </div>
      )}

      {active === 1 && (
        <div className="hjp-card hjp-card-med">
          <div className="hjp-med-header">
            <div className="hjp-med-icon"><Pill size={22} /></div>
            <div>
              <strong>Napa Extra</strong>
              <span>500mg / 65mg · Tablet</span>
            </div>
          </div>
          <div className="hjp-med-generic">Paracetamol + Caffeine</div>
          <div className="hjp-med-pharmacies">
            <MapPin size={11} />
            {bn ? '৫টি ফার্মেসিতে পাওয়া গেছে' : 'Found in 5 nearby pharmacies'}
          </div>
        </div>
      )}

      {active === 2 && (
        <div className="hjp-card hjp-card-route">
          {PHARMACIES.slice(0, 2).map((p, i) => (
            <div key={p.id} className={`hjp-route-row ${i === 0 ? 'hjp-route-row--top' : ''}`}>
              <div className="hjp-route-dot" style={{ background: i === 0 ? '#16a34a' : '#94a3b8' }} />
              <div className="hjp-route-info">
                <span>{p.name}</span>
                <small>{p.area}</small>
              </div>
              <div className="hjp-route-meta">
                <span className="hjp-route-dist">{p.distanceKm} km</span>
                <span className="hjp-route-time">
                  <Footprints size={10} />{p.driveTimeMin}m
                </span>
              </div>
            </div>
          ))}
          <div className="hjp-route-cta">
            <Navigation size={13} />
            {bn ? 'হেঁটে যাওয়ার পথ দেখুন' : 'Get walking directions'}
          </div>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   MAIN CATALOGUE
═══════════════════════════════════════════════════════════ */
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
    <main className="acme-landing">

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="acme-hero h-[calc(100vh-122px)]" aria-labelledby="landing-heading">

        {/* Left copy */}
        <div className="acme-hero-copy h-full">

          {/* Minimalist, classy Eyebrow */}


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
                <span className="acme-highlight">verified near you.</span>
              </>
            )}
          </h1>

          {/* Crisp, readable subtitle */}
          <p className="acme-hero-desc">
            {bn
              ? 'ডাক্তারের প্রেসক্রিপশন কিউআর কোড স্ক্যান করুন অথবা ওষুধের নাম দিয়ে খুঁজুন। নিকটস্থ কোন ফার্মেসিতে ওষুধটি আছে দেখুন এবং সরাসরি প্রবেশপথের লাইভ পথনির্দেশনা পান।'
              : 'Scan your doctor’s prescription QR card or search by medicine name. Instantly locate nearby pharmacies with verified stock and turn-by-turn routes straight to the entrance.'}
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
                  aria-label={bn ? 'মুছুন' : 'Clear'}
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
              <div className="acme-quick-group">
                <span className="acme-quick-label">{bn ? 'যেমন:' : 'Popular:'}</span>
                {['Napa Extra', 'Monas 10', 'Ventolin', 'Nexum'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="acme-quick-pill"
                    onClick={() => {
                      setSearch(tag);
                      setQuery(tag);
                      setOffset(0);
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <Link href={`/${locale}/q/demo`} className="acme-qr-trigger">
                <QrCode size={15} />
                <span>{bn ? 'QR কার্ড স্ক্যান' : 'Scan QR Card'}</span>
              </Link>
            </div>
          </div>


        </div>

        {/* Right: animated journey preview */}
        <div className="acme-hero-visual" aria-hidden="true">
          <JourneyPreview bn={bn} />
        </div>

      </section>

      {/* ═══════════════════════════════════════════════════
          CATALOGUE (preserved, commented for later)
      ═══════════════════════════════════════════════════ */}
      {/* <section
        className="acme-catalogue"
        id="medicines"
        ref={resultsRef}
        tabIndex={-1}
        aria-labelledby="medicines-heading"
        aria-busy={loading}
      >
        ...
      </section> */}

    </main>
  );
}
