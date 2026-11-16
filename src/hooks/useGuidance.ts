import { useEffect, useState } from 'react';
import { getContractGuidance, type ContractGuidance } from '../services/assistant';
import { ContractApiError } from '../services/contracts';

export type GuidanceState =
  | { status: 'loading' }
  | { status: 'ready'; guidance: ContractGuidance }
  | { status: 'error'; errorKey: string };

const LOADING: GuidanceState = { status: 'loading' };

/** Loads the action plan and narration script of a READY contract. */
export function useGuidance(contractId: string, token: string | null): GuidanceState {
  const requestKey = `${token ?? ''}|${contractId}`;
  const [settled, setSettled] = useState<{ key: string; state: GuidanceState } | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getContractGuidance(contractId, token)
      .then((guidance) => {
        if (!cancelled) setSettled({ key: requestKey, state: { status: 'ready', guidance } });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const errorKey = error instanceof ContractApiError ? error.messageKey : 'errors.api_error';
        setSettled({ key: requestKey, state: { status: 'error', errorKey } });
      });
    return () => {
      cancelled = true;
    };
  }, [contractId, token, requestKey]);

  return settled?.key === requestKey ? settled.state : LOADING;
}
