import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/server-api';
import { ApiError, LiveMedicine } from '@/lib/api';
import { MedicineDetail } from '@/features/catalogue/detail';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let medicine: LiveMedicine | undefined;
  try {
    medicine = await serverApi<LiveMedicine>(`public/medicines/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
  }
  if (!medicine)
    return (
      <main className="page">
        <h1>Medicine information is temporarily unavailable</h1>
        <p>Please retry shortly.</p>
      </main>
    );
  return <MedicineDetail medicine={medicine} />;
}
