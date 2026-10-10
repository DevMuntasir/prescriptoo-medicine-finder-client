import type { Metadata } from 'next';
import { Lato, Open_Sans } from 'next/font/google';
import './globals.css';

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-lato',
  display: 'swap',
});

const openSans = Open_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-open-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Prescriptoo — Closer to care', template: '%s | Prescriptoo' },
  description: 'Find listed pharmacies and directions for your medicine.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lato.variable} ${openSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
