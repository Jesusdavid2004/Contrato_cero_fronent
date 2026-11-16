import { useEffect, useState } from 'react';
import { listLegalUpdates, type LegalUpdate } from '../services/assistant';
import { ContractApiError } from '../services/contracts';

export type LegalUpdatesState =
  | { status: 'loading' }
  | { status: 'ready'; updates: LegalUpdate[] }
  | { status: 'error'; errorKey: string };

const LOADING: LegalUpdatesState = { status: 'loading' };

/** Recent legal updates, optionally narrowed to one topic. Refetches when the topic changes. */
export function useLegalUpdates(token: string | null, tema?: string): LegalUpdatesState {
  const requestKey = `${token ?? ''}|${tema ?? ''}`;
  const [settled, setSettled] = useState<{ key: string; state: LegalUpdatesState } | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listLegalUpdates(token, tema)
      .then((updates) => {
        if (!cancelled) setSettled({ key: requestKey, state: { status: 'ready', updates } });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const errorKey = error instanceof ContractApiError ? error.messageKey : 'errors.api_error';
        setSettled({ key: requestKey, state: { status: 'error', errorKey } });
      });
    return () => {
      cancelled = true;
    };
  }, [token, tema, requestKey]);

  // A result that belongs to another topic is stale: show loading until the new one lands.
  return settled?.key === requestKey ? settled.state : LOADING;
}
