import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  REFRESH_COOKIE_NAME,
  exchangeRefreshForSession,
  fetchAsUser,
} from '../../next-lib/server-auth';
import { contractSummaryListSchema } from '../../next-lib/contracts';
import { backendBaseUrl } from '../../next-lib/site';

/** SSR real: nada estatico ni compartido, consulta autorizada por request. */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HistorialPage() {
  const apiBase = backendBaseUrl();
  const session = await exchangeRefreshForSession(
    (await cookies()).get(REFRESH_COOKIE_NAME)?.value,
    apiBase,
  );
  if (!session) redirect('/login');

  const raw = await fetchAsUser(session, apiBase, '/api/v1/contracts');
  const parsed = contractSummaryListSchema.safeParse(raw);
  const contracts = parsed.success ? parsed.data : [];

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1rem' }}>
      <h1>Historial</h1>
      <p>Hola, {session.user.name}. Esta lista se consulta en el servidor en cada visita.</p>
      {contracts.length === 0 ? (
        <p>No hay contratos todavía. <Link href="/analizar">Analiza el primero</Link>.</p>
      ) : (
        <ul>
          {contracts.map((contract) => (
            <li key={contract.id}>
              <Link href={`/contratos/${encodeURIComponent(contract.id)}`}>
                {contract.title}
              </Link>{' '}
              — {contract.status} · {contract.global_risk_score}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
