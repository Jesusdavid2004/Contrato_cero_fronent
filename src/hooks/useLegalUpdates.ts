import { useEffect, useState } from 'react';
import { listLegalUpdates, type LegalUpdate } from '../services/assistant';
import { ContractApiError } from '../services/contracts';

export type LegalUpdatesState =
  | { status: 'loading' }
  | { status: 'ready'; updates: LegalUpdate[] }
  | { status: 'error'; errorKey: string };

/** Recent legal updates, optionally narrowed to one topic. Refetches when the topic changes. */
export function useLegalUpdates(token: string | null, tema?: string): LegalUpdatesState {
  const [state, setState] = useState<LegalUpdatesState>({ status: 'loading' });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setState({ status: 'loading' });
    listLegalUpdates(token, tema)
      .then((updates) => {
        if (!cancelled) setState({ status: 'ready', updates });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          errorKey: error instanceof ContractApiError ? error.messageKey : 'errors.api_error',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [token, tema]);

  return state;
}
