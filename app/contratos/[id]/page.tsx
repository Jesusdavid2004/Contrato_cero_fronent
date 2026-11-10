import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import {
  REFRESH_COOKIE_NAME,
  exchangeRefreshForSession,
  fetchAsUser,
  type ServerSession,
} from '../../../next-lib/server-auth';
import { backendBaseUrl } from '../../../next-lib/site';
import { ContractLive } from './contract-live';

/** Streaming SSR: shell temprano, datos sensibles solo tras autorizar. */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const clauseSchema = z.object({
  id: z.string(),
  original_text: z.string(),
  risk_level: z.enum(['low', 'medium', 'high']),
  confidence: z.number(),
  plain_explanation: z.string(),
});

const contractDetailSchema = z.object({
  id: z.string(),
  status: z.string(),
  global_risk_score: z.number(),
  clauses: z.array(clauseSchema),
});

async function ContractDetail({ session, apiBase, contractId }: {
  session: ServerSession;
  apiBase: string;
  contractId: string;
}) {
  const raw = await fetchAsUser(session, apiBase, `/api/v1/contracts/${encodeURIComponent(contractId)}`);
  const parsed = contractDetailSchema.safeParse(raw);
  if (!parsed.success) {
    return <p>No se pudo cargar el análisis. Verifica que el contrato sea tuyo.</p>;
  }
  const contract = parsed.data;
  return (
    <section>
      <h2>
        Riesgo global: {contract.global_risk_score} · {contract.clauses.length} cláusulas
      </h2>
      <ul>
        {contract.clauses.map((clause) => (
          <li key={clause.id}>
            <strong>{clause.risk_level}</strong> ({Math.round(clause.confidence * 100)}%):{' '}
            {clause.original_text.slice(0, 160)}
            <br />
            <small>{clause.plain_explanation}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function ContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiBase = backendBaseUrl();
  const session = await exchangeRefreshForSession(
    (await cookies()).get(REFRESH_COOKIE_NAME)?.value,
    apiBase,
  );
  if (!session) redirect('/login');

  const statusRaw = await fetchAsUser(session, apiBase, `/api/v1/contracts/${encodeURIComponent(id)}/status`);
  const status = (statusRaw as { status?: unknown } | null)?.status;
  const initialStatus = typeof status === 'string' ? status : 'UNKNOWN';

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1rem' }}>
      <Link href="/historial">Historial</Link>
      <h1>Contrato</h1>
      <p>Estado: {initialStatus}</p>
      <ContractLive contractId={id} initialStatus={initialStatus} />
      <Suspense fallback={<p>Cargando resultado del análisis…</p>}>
        <ContractDetail session={session} apiBase={apiBase} contractId={id} />
      </Suspense>
    </main>
  );
}
