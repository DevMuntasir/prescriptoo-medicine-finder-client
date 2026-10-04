import { CatalogueAdapter } from '@/contracts';
import { medicines, pharmacies } from './fixtures';
export const catalogueAdapter: CatalogueAdapter = {
  list: () => medicines,
  find: (slug) => medicines.find((m) => m.slug === slug),
  pharmacies: (medicineId) =>
    pharmacies.slice(0, medicines.find((m) => m.id === medicineId)?.pharmacies ?? 0),
};
