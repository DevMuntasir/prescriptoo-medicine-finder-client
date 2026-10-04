import { QRLanding } from '@/features/referrals/qr-landing';
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <QRLanding token={token} />;
}
