'use client';
import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  MapPin,
  ShieldCheck,
  Pill,
  Plus,
  LocateFixed,
  ChevronRight,
} from 'lucide-react';
import { api, LiveMedicine } from '@/lib/api';
import { Medicine } from '@/contracts';
import { Badge, Empty } from '@/components/ui/primitives';
export function MedicineArt({ medicine, large = false }: { medicine: Medicine; large?: boolean }) {
  return (
    <div className={`medicine-art ${medicine.color} ${large ? 'large' : ''}`} aria-hidden="true">
      {medicine.imageFileId ? (
        <Image
          src={`/api/v1/public/images/${medicine.imageFileId}`}
          alt={medicine.name}
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
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  useEffect(() => {
    let active = true;
    api<(LiveMedicine & { total: number })[]>(`public/medicines?limit=100&offset=${offset}`)
      .then((rows) => {
        if (!active) return;
        setMedicines((previous) => [
          ...(offset ? previous : []),
          ...rows.map((m) => ({
            id: m.id,
            slug: m.slug,
            name: m.name_en,
            nameBn: m.name_bn,
            generic: m.generic_en,
            genericBn: m.generic_bn,
            strength: m.strength,
            form: m.form,
            category: m.category,
            status: 'Published' as const,
            color: 'mint',
            pharmacies: 0,
            imageFileId: m.image_file_id,
          })),
        ]);
        setHasMore(offset + rows.length < (rows[0]?.total ?? 0));
        setLoading(false);
      })
      .catch((e) => {
        if (active) {
          setLoadError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [offset]);
  const locale = useLocale();
  const t = useTranslations();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All medicines');
  const categories = [
    'All medicines',
    ...new Set(medicines.map((m) => m.category).filter(Boolean)),
  ];
  const filtered = medicines.filter(
    (m) =>
      m.status === 'Published' &&
      (category === 'All medicines' || m.category === category) &&
      `${m.name} ${m.generic} ${m.nameBn ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          {/* <div className="eyebrow">
            <span className="small-line" />
            {locale === 'bn' ? 'যত্নের আরও কাছে' : 'A LITTLE CLOSER TO CARE'}
          </div> */}
          <h1>
            {t('heading')
              .split('\n')
              .map((line, i) => (
                <span key={i} className={i ? 'accent' : ''}>
                  {line}
                </span>
              ))}
          </h1>
          <p>{t('intro')}</p>
          <a className="button" href="#medicines">
            {t('browse')}
            <ArrowRight size={18} />
          </a>
          {/* <div className="hero-trust">
            <ShieldCheck size={17} />
            {locale === 'bn'
              ? 'অবস্থানের তথ্য ছাড়াই ওষুধ দেখুন'
              : 'Browse first. Choose your location when you’re ready.'}
          </div> */}
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-cross">+</div>
          <div className="hero-map">
            <svg viewBox="0 0 400 350">
              <path
                d="M-10 85L420 180M25-10L160 360M-10 255L420 115M260-10L190 370M340-10L340 370"
                stroke="#fff"
                strokeWidth="15"
              />
              <path
                d="M190 230L190 175Q190 140 235 140L290 140"
                stroke="#177d71"
                strokeWidth="4"
                strokeDasharray="7 6"
                fill="none"
              />
            </svg>
            <div className="hero-pin">
              <MapPin size={27} fill="currentColor" stroke="white" />
            </div>
            <div className="origin-dot" />
          </div>
          <div className="floating-card pharmacy-float">
            <span className="float-icon">
              <CrossIcon />
            </span>
            <div>
              <strong>{locale === 'bn' ? 'কাছাকাছি ফার্মেসি' : 'A pharmacy close by'}</strong>
              <small>
                {locale === 'bn' ? 'নমুনা অবস্থান · ০.৪ কিমি' : 'Sample location · 0.4 km away'}
              </small>
            </div>
            <span className="float-check">✓</span>
          </div>
          <div className="floating-card care-float">
            <span className="float-pill">
              <Pill size={20} />
            </span>
            <div>
              <strong>
                {locale === 'bn' ? 'আপনার পরবর্তী পদক্ষেপ' : 'Your next step, simplified'}
              </strong>
              <small>
                {locale === 'bn'
                  ? 'ওষুধ → ফার্মেসি → দিকনির্দেশনা'
                  : 'Medicine → pharmacy → directions'}
              </small>
            </div>
          </div>
          {/* <span className="visual-label">ILLUSTRATIVE MAP</span> */}
        </div>
      </section>
      {/* <section className="benefits">
        <div>
          <span className="benefit-icon">
            <Pill size={21} />
          </span>
          <div>
            <strong>{locale === 'bn' ? 'সহজে খুঁজুন' : 'Find what you need'}</strong>
            <p>
              {locale === 'bn' ? 'ওষুধ বা জেনেরিক নাম দিয়ে' : 'Search by medicine or generic name'}
            </p>
          </div>
        </div>
        <div>
          <span className="benefit-icon">
            <MapPin size={21} />
          </span>
          <div>
            <strong>{locale === 'bn' ? 'কাছাকাছি ফার্মেসি' : 'Explore nearby pharmacies'}</strong>
            <p>{locale === 'bn' ? 'তালিকা ও মানচিত্র একসাথে' : 'A clear list and map, together'}</p>
          </div>
        </div>
        <div>
          <span className="benefit-icon">
            <LocateFixed size={21} />
          </span>
          <div>
            <strong>{locale === 'bn' ? 'পরবর্তী পদক্ষেপ নিন' : 'Take the next step'}</strong>
            <p>
              {locale === 'bn'
                ? 'হেঁটে বা গাড়িতে যাওয়ার পথ'
                : 'Choose walking or driving directions'}
            </p>
          </div>
        </div>
      </section> */}
      <section className="catalogue-section" id="medicines">
        {loading && <p role="status">{locale === 'bn' ? 'লোড হচ্ছে…' : 'Loading medicines…'}</p>}
        {loadError && (
          <p role="alert">
            {loadError}{' '}
            <button className="text-link" onClick={() => window.location.reload()}>
              Retry
            </button>
          </p>
        )}
        <div className="section-heading">
          <div>
            {/* <span className="eyebrow">
              {locale === 'bn' ? 'ওষুধের তালিকা' : 'THE MEDICINE DIRECTORY'}
            </span> */}
            <h2>{locale === 'bn' ? 'খুঁজে নিন আপনার ওষুধ' : 'A good place to start.'}</h2>
            {/* <p className="muted">
              {locale === 'bn'
                ? 'প্রকাশিত ওষুধ ও তালিকাভুক্ত ফার্মেসি।'
                : 'Published medicines and listed pharmacies.'}
            </p> */}
          </div>
          <Badge tone="teal">
            {medicines.filter((m) => m.status === 'Published').length}{' '}
            {locale === 'bn' ? 'ওষুধ' : 'medicines'}
          </Badge>
        </div>
        <div className="catalogue-controls">
          <label className="search-box">
            <Search size={19} />
            <input
              aria-label={t('search')}
              placeholder={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>/</kbd>
          </label>
        </div>
        <div className="category-tabs">
          {categories.map((c, i) => (
            <button
              key={c}
              className={category === c ? 'active' : ''}
              onClick={() => setCategory(c)}
            >
              {locale === 'bn' && i === 0 ? 'সব ওষুধ' : c}
            </button>
          ))}
        </div>
        {!loading && !loadError && filtered.length === 0 ? (
          <Empty title={t('empty')}>
            <button
              className="button button-outline"
              onClick={() => {
                setSearch('');
                setCategory('All medicines');
              }}
            >
              {t('reset')}
            </button>
          </Empty>
        ) : (
          <div className="medicine-grid">
            {filtered.map((m) => (
              <article className="medicine-card" key={m.id}>
                <Link
                  href={`/${locale}/medicines/${m.slug}`}
                  aria-label={`${t('details')}: ${m.name}`}
                >
                  <MedicineArt medicine={m} />
                </Link>
                <div className="medicine-card-body">
                  <div className="medicine-meta">
                    <span>
                      {locale === 'bn'
                        ? {
                            Tablet: 'ট্যাবলেট',
                            Capsule: 'ক্যাপসুল',
                            Sachet: 'স্যাশে',
                            Suspension: 'সাসপেনশন',
                          }[m.form] || m.form
                        : m.form}
                    </span>
                    <span>{m.strength}</span>
                  </div>
                  <Link href={`/${locale}/medicines/${m.slug}`}>
                    <h3>{locale === 'bn' ? m.nameBn || m.name : m.name}</h3>
                  </Link>
                  <p>{locale === 'bn' ? m.genericBn || m.generic : m.generic}</p>
                  {locale === 'bn' && !m.nameBn && <Badge>English content fallback</Badge>}
                  <div className="medicine-card-footer">
                    <span>
                      <MapPin size={14} />
                      {locale === 'bn' ? 'ফার্মেসি খুঁজুন' : 'Find pharmacies'}
                    </span>
                    <Link
                      href={`/${locale}/medicines/${m.slug}`}
                      aria-label={`${t('details')}: ${m.name}`}
                    >
                      <ArrowUpRight size={20} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {/* <p className="catalogue-note">
          <ShieldCheck size={15} />
          {locale === 'bn'
            ? 'সংযুক্ত ফার্মেসির তালিকা ওষুধের মজুত নিশ্চিত করে না।'
            : 'A pharmacy listing does not guarantee medicine availability. Contact the pharmacy to confirm.'}
        </p> */}
      </section>
      {hasMore && (
        <button className="button" onClick={() => setOffset(offset + 100)}>
          Load more medicines
        </button>
      )}
      {/* <section className="how-section" id="how-it-works">
        <div>
          <span className="eyebrow">
            {locale === 'bn' ? 'যেভাবে কাজ করে' : 'A SIMPLE NEXT STEP'}
          </span>
          <h2>{locale === 'bn' ? 'তিন ধাপে, যত্নের কাছে।' : 'Three steps. A little closer.'}</h2>
        </div>
        <div className="how-grid">
          {[
            {
              n: '01',
              icon: Pill,
              title: locale === 'bn' ? 'ওষুধ খুঁজুন' : 'Find your medicine',
              copy:
                locale === 'bn'
                  ? 'ওষুধের তথ্য ও বিস্তারিত দেখুন।'
                  : 'Browse the directory and open medicine details.',
            },
            {
              n: '02',
              icon: MapPin,
              title: locale === 'bn' ? 'শুরুর স্থান বেছে নিন' : 'Choose your starting point',
              copy:
                locale === 'bn'
                  ? 'এলাকা বা নমুনা পিন দিয়ে শুরু করুন।'
                  : 'Select an area or confirm a sample pin.',
            },
            {
              n: '03',
              icon: ArrowRight,
              title: locale === 'bn' ? 'ফার্মেসি বেছে নিন' : 'Choose a pharmacy',
              copy:
                locale === 'bn'
                  ? 'তালিকা দেখুন, তারপর পথ বেছে নিন।'
                  : 'Explore the list, then choose your directions.',
            },
          ].map((s) => (
            <div key={s.n} className="how-card">
              <div>
                <span>{s.n}</span>
                <s.icon size={24} />
              </div>
              <h3>{s.title}</h3>
              <p>{s.copy}</p>
            </div>
          ))}
        </div>
        <Link href={`/${locale}/privacy`} className="text-link">
          {locale === 'bn' ? 'আপনার গোপনীয়তা সম্পর্কে জানুন' : 'Your privacy, at every step'}
          <ChevronRight size={16} />
        </Link>
      </section> */}
    </main>
  );
}
function CrossIcon() {
  return <Plus size={24} strokeWidth={3} />;
}
