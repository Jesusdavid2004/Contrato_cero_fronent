import Link from 'next/link';
import { cookies } from 'next/headers';
import { getDictionary, parseLocale } from '../next-lib/dictionary';

export const dynamic = 'force-static';

/** SSG: landing publica sin datos personales, generada en build. */
export default async function HomePage() {
  const locale = parseLocale((await cookies()).get('cc_locale')?.value);
  const t = getDictionary(locale);
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1rem' }}>
      <h1>ContratoClaro</h1>
      <p>{t['home.subtitle']}</p>
      <nav style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <Link href="/analizar">Analizar</Link>
        <Link href="/cobertura">Cobertura</Link>
        <Link href="/ayuda">Ayuda</Link>
        <Link href="/privacidad">Privacidad</Link>
      </nav>
      <p style={{ marginTop: '2rem' }}>
        <small>Informacion general, no asesoria legal.</small>
      </p>
    </main>
  );
}
