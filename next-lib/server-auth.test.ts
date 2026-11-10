import { describe, it, expect, vi } from 'vitest';
import { exchangeRefreshForSession, fetchAsUser } from './server-auth';

function okJson(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('server-auth', () => {
  it('retorna null sin cookie de refresh', async () => {
    const fetchFn = vi.fn();
    await expect(exchangeRefreshForSession(undefined, 'http://api', fetchFn)).resolves.toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('canjea la cookie httpOnly sin exponer tokens al JS', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okJson({ accessToken: 'abc', user: { id: 'u1', email: 'a@b.c', name: 'Ana' } }),
    );
    const session = await exchangeRefreshForSession('cookie-valor', 'http://api', fetchFn);
    expect(session).toEqual({
      accessToken: 'abc',
      user: { id: 'u1', email: 'a@b.c', name: 'Ana' },
    });
    expect(fetchFn).toHaveBeenCalledWith(
      'http://api/api/v1/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        headers: { cookie: 'cc_refresh_token=cookie-valor' },
      }),
    );
  });

  it('retorna null si el canje falla o la forma es invalida', async () => {
    const denied = vi.fn().mockResolvedValue(okJson({ message: 'no' }, 401));
    await expect(exchangeRefreshForSession('x', 'http://api', denied)).resolves.toBeNull();
    const malformed = vi.fn().mockResolvedValue(okJson({ accessToken: 42 }));
    await expect(exchangeRefreshForSession('x', 'http://api', malformed)).resolves.toBeNull();
    const down = vi.fn().mockRejectedValue(new Error('down'));
    await expect(exchangeRefreshForSession('x', 'http://api', down)).resolves.toBeNull();
  });

  it('fetchAsUser usa Bearer en memoria del servidor y no usa cache', async () => {
    const fetchFn = vi.fn().mockResolvedValue(okJson([{ id: 'c1' }]));
    const session = { accessToken: 'abc', user: { id: 'u1', email: 'a@b.c', name: 'Ana' } };
    const realFetch = globalThis.fetch;
    globalThis.fetch = fetchFn as unknown as typeof fetch;
    try {
      const result = await fetchAsUser(session, 'http://api', '/api/v1/contracts');
      expect(result).toEqual([{ id: 'c1' }]);
      expect(fetchFn).toHaveBeenCalledWith(
        'http://api/api/v1/contracts',
        expect.objectContaining({
          headers: { Authorization: 'Bearer abc' },
          cache: 'no-store',
        }),
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
