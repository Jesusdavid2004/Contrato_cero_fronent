import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { GUIDES, getGuide } from '../../../next-lib/guias';
import { parseLocale } from '../../../next-lib/dictionary';

export const revalidate = 3600;

export function generateStaticParams(): Array<{ slug: string }> {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

/** ISR por slug: se genera en build y se revalida por intervalo. */
export default async function GuiaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();
  const locale = parseLocale((await cookies()).get('cc_locale')?.value);
  const title = locale === 'en' ? guide.titleEn : guide.titleEs;
  const body = locale === 'en' ? guide.bodyEn : guide.bodyEs;
  return (
    <main style={{ maxWidth: 672, margin: '0 auto', padding: '3rem 1rem' }}>
      <Link href="/cobertura">Cobertura</Link>
      <h1 style={{ marginTop: '0.75rem' }}>{title}</h1>
      <p>
        <small>Actualizada {guide.updatedAt} · se revalida cada hora</small>
      </p>
      {body.map((paragraph) => (
        <p key={paragraph.slice(0, 24)}>{paragraph}</p>
      ))}
    </main>
  );
}
