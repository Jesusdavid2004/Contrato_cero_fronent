import { useEffect, useState } from 'react';
import { getContractGuidance, type ContractGuidance } from '../services/assistant';
import { ContractApiError } from '../services/contracts';

export type GuidanceState =
  | { status: 'loading' }
  | { status: 'ready'; guidance: ContractGuidance }
  | { status: 'error'; errorKey: string };

/** Loads the action plan and narration script of a READY contract. */
export function useGuidance(contractId: string, token: string | null): GuidanceState {
  const [state, setState] = useState<GuidanceState>({ status: 'loading' });

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setState({ status: 'loading' });
    getContractGuidance(contractId, token)
      .then((guidance) => {
        if (!cancelled) setState({ status: 'ready', guidance });
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
  }, [contractId, token]);

  return state;
}
