export type Locale = 'en' | 'bn';
export type Status = 'Published' | 'Draft' | 'Archived' | 'Active' | 'Inactive';
export interface Medicine {
  id: string;
  slug: string;
  name: string;
  nameBn?: string;
  generic: string;
  genericBn?: string;
  strength: string;
  form: string;
  category: string;
  status: Status;
  color: string;
  pharmacies: number;
  imageFileId?: string;
}
export interface Pharmacy {
  id: string;
  name: string;
  area: string;
  address: string;
  distance: number;
  phone?: string;
  hours?: string;
  stock?: string;
  x: number;
  y: number;
}
export interface DemoRecord {
  id: string;
  name: string;
  detail: string;
  area: string;
  status: Status;
  metadata?: {
    grants?: string[];
    managementScope?: string;
    analyticsScope?: string;
    chamber?: string;
    latitude?: string;
    longitude?: string;
    hours?: string;
    phone?: string;
    medicineId?: string;
    doctorId?: string;
    chamberName?: string;
  };
}
export type Persona = 'Administrator' | 'Area manager' | 'Analytics viewer' | 'Disabled account';
export interface CatalogueAdapter {
  list(): Medicine[];
  find(slug: string): Medicine | undefined;
  pharmacies(medicineId: string): Pharmacy[];
}

export interface Mapping {
  medicineId: string;
  pharmacyId: string;
  active: boolean;
  stock: string;
}
