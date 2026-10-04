import 'server-only';
import { ApiError } from './api';
export async function serverApi<T>(path: string): Promise<T> {
  const response = await fetch(
    `${process.env.API_INTERNAL_ORIGIN ?? 'http://127.0.0.1:4000'}/api/v1/${path}`,
    { cache: 'no-store', signal: AbortSignal.timeout(10000) },
  );
  const body = await response.json();
  if (!response.ok)
    throw new ApiError(
      body.error?.code ?? 'REQUEST_FAILED',
      body.error?.message ?? 'Service unavailable',
      response.status,
    );
  return body.data;
}
