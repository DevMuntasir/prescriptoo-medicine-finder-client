import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Prescriptoo — Closer to care', template: '%s | Prescriptoo' },
  description: 'Find listed pharmacies and directions for your medicine.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
