import Link from 'next/link';
import { cookies } from 'next/headers';
import { parseLocale } from '../../../next-lib/dictionary';

export const dynamic = 'force-static';

const COPY = {
  es: {
    title: 'Ayuda',
    intro: 'Cómo usar ContratoClaro en cuatro pasos. Información general, no asesoría legal.',
    steps: [
      'Crea tu cuenta e inicia sesión.',
      'Sube un contrato en PDF o imagen (máximo 10 MB).',
      'Revisa cada cláusula con su nivel de riesgo y explicación.',
      'Genera tu carta de objeción, edítala y descárgala en PDF.',
    ],
    limits: 'Límites honestos: el análisis es informativo, la cobertura inicial es experimental para arrendamiento en Colombia y los originales no se conservan.',
  },
  en: {
    title: 'Help',
    intro: 'How to use ContratoClaro in four steps. General information, not legal advice.',
    steps: [
      'Create your account and sign in.',
      'Upload a contract as PDF or image (max 10 MB).',
      'Review each clause with its risk level and explanation.',
      'Generate your objection letter, edit it and download the PDF.',
    ],
    limits: 'Honest limits: analysis is informational, initial coverage is experimental for leasing in Colombia, and originals are not retained.',
  },
} as const;

/** SSG: ayuda publica y estatica, generada en build. */
export default async function AyudaPage() {
  const locale = parseLocale((await cookies()).get('cc_locale')?.value);
  const copy = COPY[locale];
  return (
    <main style={{ maxWidth: 672, margin: '0 auto', padding: '3rem 1rem' }}>
      <Link href="/">ContratoClaro</Link>
      <h1 style={{ marginTop: '0.75rem' }}>{copy.title}</h1>
      <p>{copy.intro}</p>
      <ol>
        {copy.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p>
        <small>{copy.limits}</small>
      </p>
    </main>
  );
}
