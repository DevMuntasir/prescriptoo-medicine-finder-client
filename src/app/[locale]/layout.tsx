import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { PatientShell } from '@/components/layout/patient-shell';
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== 'en' && locale !== 'bn') notFound();
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div lang={locale}>
        <PatientShell locale={locale}>{children}</PatientShell>
      </div>
    </NextIntlClientProvider>
  );
}
