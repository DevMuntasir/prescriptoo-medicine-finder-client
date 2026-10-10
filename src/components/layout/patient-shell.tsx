'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useState, ReactNode } from 'react';
import { Locale } from '@/contracts';
export function Brand() {
  return (
    <span className="acme-brand">
      <Image
        src="/acme-logo.png"
        alt="The ACME Laboratories Ltd."
        width={250}
        height={59}
        priority
      />
      <span>
        MEDICINE
        <br />
        LOCATOR
      </span>
    </span>
  );
}
export function PatientShell({ children, locale }: { children: ReactNode; locale: Locale }) {
  const t = useTranslations();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const other = locale === 'en' ? 'bn' : 'en';
  const focused = path.endsWith('/locator');
  const brand = <Brand />;
  return (
    <div className="acme-shell">
      {/* <div className="demo-bar">
        <span className="demo-dot" />
        {locale === 'bn' ? 'ফার্মেসি খুঁজুন · মজুতের তথ্য দোকানে নিশ্চিত করুন' : 'Find listed pharmacies · confirm stock with the shop'}
      </div> */}
      <header className={`patient-header ${focused ? 'focused-header' : ''}`}>
        <Link href={`/${locale}`} aria-label="ACME medicine locator home">
          {brand}
        </Link>
        {focused ? (
          <Link className="language-switch" href={path.replace(`/${locale}`, `/${other}`)}>
            {t('language')}
          </Link>
        ) : (
          <>
            <button
              className="mobile-menu icon-button"
              aria-label="Toggle navigation"
              aria-expanded={menu}
              aria-controls="patient-navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
            <nav id="patient-navigation" className={menu ? 'patient-nav open' : 'patient-nav'}>
              <Link onClick={() => setMenu(false)} href={`/${locale}#medicines`}>
                {t('catalogue')}
              </Link>
              <Link onClick={() => setMenu(false)} href={`/${locale}#how-it-works`}>
                {t('how')}
              </Link>
              <Link onClick={() => setMenu(false)} href={`/${locale}/privacy`}>
                {t('privacy')}
              </Link>
              <Link className="language" href={path.replace(`/${locale}`, `/${other}`)}>
                {t('language')}
              </Link>
              <Link className="button button-outline small" href="/admin">
                {t('admin')}
                <ArrowUpRight size={14} />
              </Link>
            </nav>
          </>
        )}
      </header>
      {children}
      {!focused && (
        <footer className="patient-footer">
          <div>
            {brand}
            <p>{t('footer')}</p>
          </div>
          <div className="footer-links">
            <Link href={`/${locale}/privacy`}>{t('privacy')}</Link>
            <Link href={`/${locale}/terms`}>{locale === 'bn' ? 'শর্তাবলি' : 'Terms'}</Link>
            <span>© 2026 · The ACME Laboratories Ltd.</span>
          </div>
        </footer>
      )}
    </div>
  );
}
