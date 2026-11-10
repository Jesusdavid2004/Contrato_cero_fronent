'use client';

import { ClauseCard } from '../../src/components/ClauseCard';
import type { ContractAnalysisResult } from '../../src/services/contracts';

/** Visor diferido del resultado: solo se descarga cuando hay analisis. */
export function ResultsView({ result }: { result: ContractAnalysisResult }) {
  return (
    <section aria-live="polite">
      <h2>
        Riesgo global: {result.global_risk_score} · {result.clauses.length} cláusulas
      </h2>
      {result.clauses.map((clause) => (
        <ClauseCard key={clause.id} clause={clause} />
      ))}
    </section>
  );
}
