import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) {
  try {
    process.loadEnvFile('../.env');
  } catch {
    // Docker/isolated frontend builds receive the public key through their environment.
  }
}
const config: NextConfig = { devIndicators: false, output: 'standalone' };
export default createNextIntlPlugin('./src/i18n/request.ts')(config);
