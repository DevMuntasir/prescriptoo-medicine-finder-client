export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  });
  const body = await response.json();
  if (!response.ok)
    throw new ApiError(
      body.error?.code ?? 'REQUEST_FAILED',
      body.error?.message ?? body.message ?? 'Request failed',
      response.status,
    );
  return body.data as T;
}
export const json = (value: unknown) => JSON.stringify(value);
export interface LiveMedicine {
  id: string;
  slug: string;
  name_en: string;
  name_bn?: string;
  generic_en: string;
  generic_bn?: string;
  strength: string;
  form: string;
  category: string;
  description_en: string;
  description_bn?: string;
  image_file_id?: string;
  revision: number;
}
export interface LivePharmacy {
  id: string;
  name_en: string;
  name_bn?: string;
  address_en: string;
  address_bn?: string;
  latitude: number;
  longitude: number;
  distance_m: number;
  locality_id: string;
  phone?: string;
  hours?: string;
  stock_status?: string;
}
export interface LiveArea {
  id: string;
  parent_id: string | null;
  type: string;
  name_en: string;
  name_bn?: string;
  latitude?: number;
  longitude?: number;
}
export interface Origin {
  latitude: number;
  longitude: number;
  source: 'gps' | 'selected-pin';
  accuracy?: number;
  confirmed: true;
}
export interface LiveRoute {
  attribution?: string;
  provider?: string;
  distanceMeters: number;
  duration: string;
  polyline: string;
  steps: { distanceMeters: number; instruction: string }[];
  warnings: string[];
  locale: string;
}
export function name(value: { name_en: string; name_bn?: string }, locale: string) {
  return locale === 'bn' && value.name_bn ? value.name_bn : value.name_en;
}
