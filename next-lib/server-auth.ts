import { z } from 'zod';

export const REFRESH_COOKIE_NAME = 'cc_refresh_token';

const sessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
}).passthrough();

const refreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: sessionUserSchema,
});

export interface ServerSession {
  accessToken: string;
  user: z.infer<typeof sessionUserSchema>;
}

/**
 * Sesion del lado del servidor sin exponer tokens al JS: lee la cookie
 * httpOnly de refresh que llega con la navegacion, la canjea por HTTP contra
 * Express y conserva el access token solo en memoria del request. Sin cookie
 * o con canje fallido retorna null (la pagina redirige a /login).
 */
export async function exchangeRefreshForSession(
  refreshCookie: string | undefined,
  apiBase: string,
  fetchFn: typeof fetch = fetch,
): Promise<ServerSession | null> {
  if (!refreshCookie) return null;
  let response: Response;
  try {
    response = await fetchFn(`${apiBase}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { cookie: `${REFRESH_COOKIE_NAME}=${refreshCookie}` },
      cache: 'no-store',
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  let body: unknown;
  try {
    body = (await response.json()) as unknown;
  } catch {
    return null;
  }
  const parsed = refreshResponseSchema.safeParse(body);
  if (!parsed.success) return null;
  return { accessToken: parsed.data.accessToken, user: parsed.data.user };
}

/** GET autenticado con Bearer en memoria del servidor, sin cache compartida. */
export async function fetchAsUser(
  session: ServerSession,
  apiBase: string,
  path: string,
): Promise<unknown | null> {
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}
