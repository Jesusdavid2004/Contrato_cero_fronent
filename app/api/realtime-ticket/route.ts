import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  REFRESH_COOKIE_NAME,
  exchangeRefreshForSession,
} from '../../../next-lib/server-auth';
import { backendBaseUrl } from '../../../next-lib/site';

const ticketResponseSchema = z.object({
  ticket: z.string().min(1),
  expiresAt: z.string().datetime(),
});

/**
 * BFF minimo de transporte: canjea la cookie httpOnly por sesion en memoria
 * del servidor y pide un ticket de un solo uso a Express. No duplica reglas
 * ni toca PostgreSQL; el socket va directo a la API (WSS + allowlist).
 */
export async function POST(): Promise<Response> {
  const apiBase = backendBaseUrl();
  const session = await exchangeRefreshForSession(
    (await cookies()).get(REFRESH_COOKIE_NAME)?.value,
    apiBase,
  );
  if (!session) {
    return Response.json({ code: 'Unauthorized', message_key: 'errors.unauthorized' }, { status: 401 });
  }
  let response: Response;
  try {
    response = await fetch(`${apiBase}/api/v1/realtime/ticket`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
    });
  } catch {
    return Response.json({ code: 'UpstreamError', message_key: 'errors.api_error' }, { status: 502 });
  }
  if (!response.ok) {
    return Response.json({ code: 'UpstreamError', message_key: 'errors.api_error' }, { status: response.status });
  }
  let body: unknown;
  try {
    body = (await response.json()) as unknown;
  } catch {
    return Response.json({ code: 'UpstreamError', message_key: 'errors.api_error' }, { status: 502 });
  }
  const parsed = ticketResponseSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ code: 'UpstreamError', message_key: 'errors.api_error' }, { status: 502 });
  }
  return Response.json(parsed.data, { status: 201 });
}
