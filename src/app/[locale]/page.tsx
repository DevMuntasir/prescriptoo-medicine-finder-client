import { Catalogue } from '@/features/catalogue/catalogue';
export const metadata = {
  title: { absolute: 'ACME — Medicine Locator' },
  description: 'Find ACME medicines, explore listed pharmacies, and get directions.',
};
export default function Page() {
  return <Catalogue />;
}
