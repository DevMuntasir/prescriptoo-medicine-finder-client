import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.some((p) => !/^[A-Za-z0-9_.-]+$/.test(p) || p === '..' || p === '.'))
    return Response.json({ error: { code: 'PATH', message: 'Invalid path' } }, { status: 400 });
  const headers = new Headers();
  for (const key of ['cookie', 'content-type', 'origin']) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  try {
    const upstream = await fetch(
      `${process.env.API_INTERNAL_ORIGIN ?? 'http://127.0.0.1:4000'}/api/v1/${path.join('/')}${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.timeout(25000),
      },
    );
    const outgoing = new Headers({ 'Cache-Control': 'no-store' });
    for (const key of ['content-type', 'content-disposition', 'retry-after', 'x-request-id']) {
      const value = upstream.headers.get(key);
      if (value) outgoing.set(key, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) outgoing.append('set-cookie', cookie);
    return new Response(upstream.body, { status: upstream.status, headers: outgoing });
  } catch {
    return Response.json(
      { error: { code: 'BACKEND_UNAVAILABLE', message: 'Service unavailable. Please retry.' } },
      { status: 503 },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
