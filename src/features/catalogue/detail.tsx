'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { ArrowLeft, ArrowRight, Pill, MapPin } from 'lucide-react';
import { LiveMedicine, name, api, json } from '@/lib/api';
import { useEffect } from 'react';
export function MedicineDetail({ medicine: m }: { medicine: LiveMedicine }) {
  const locale = useLocale(),
    bn = locale === 'bn';
  useEffect(() => {
    void api('public/events', {
      method: 'POST',
      body: json({
        events: [{ id: crypto.randomUUID(), type: 'medicine_view', medicineId: m.id }],
      }),
    }).catch(() => {});
  }, [m.id]);
  return (
    <main className="page">
      <Link className="back-link" href={`/${locale}`}>
        <ArrowLeft size={16} />
        {bn ? 'তালিকায় ফিরুন' : 'Back to directory'}
      </Link>
      <div className="detail-grid">
        <div className="medicine-art mint large">
          {m.image_file_id ? (
            <Image
              src={`/api/v1/public/images/${m.image_file_id}`}
              alt={name(m, locale)}
              width={500}
              height={400}
            />
          ) : (
            <Pill size={90} />
          )}
        </div>
        <div className="detail-copy">
          <span className="eyebrow">{bn ? 'ওষুধের তথ্য' : 'MEDICINE INFORMATION'}</span>
          <h1>{name(m, locale)}</h1>
          <p className="detail-generic">{bn && m.generic_bn ? m.generic_bn : m.generic_en}</p>
          {bn && !m.name_bn && <p className="small muted">English content fallback</p>}
          <div className="detail-specs">
            <div>
              <span>{bn ? 'মাত্রা' : 'Strength'}</span>
              <strong>{m.strength || '—'}</strong>
            </div>
            <div>
              <span>{bn ? 'ধরন' : 'Form'}</span>
              <strong>{m.form || '—'}</strong>
            </div>
            <div>
              <span>{bn ? 'বিভাগ' : 'Category'}</span>
              <strong>{m.category || '—'}</strong>
            </div>
          </div>
          <p>{bn && m.description_bn ? m.description_bn : m.description_en}</p>
          <div className="info-banner">
            <MapPin size={20} />
            <p>
              {bn
                ? 'তালিকাভুক্ত থাকা মজুতের নিশ্চয়তা নয়। দোকানে নিশ্চিত করুন।'
                : 'A listing does not guarantee stock. Confirm with the shop.'}
            </p>
          </div>
          <Link className="button" href={`/${locale}/medicines/${m.slug}/locator`}>
            {bn ? 'কাছের ফার্মেসি খুঁজুন' : 'Find nearby pharmacies'}
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </main>
  );
}
