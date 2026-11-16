import { useGuidance } from '../../hooks/useGuidance';
import { LegalUpdateNotice } from '../LegalUpdateNotice';
import { NarratorPanel } from './NarratorPanel';

/** Loads the guidance once and renders the legal-update banner plus the guided walkthrough. */
export function ContractGuide({
  contractId,
  token,
  onActiveClauseChange,
}: {
  contractId: string;
  token: string | null;
  onActiveClauseChange: (clauseId: string | null) => void;
}) {
  const guidance = useGuidance(contractId, token);
  return (
    <>
      {guidance.status === 'ready' && <LegalUpdateNotice count={guidance.guidance.pending_legal_updates} />}
      <NarratorPanel guidance={guidance} onActiveClauseChange={onActiveClauseChange} />
    </>
  );
}
