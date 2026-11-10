import Link from 'next/link';
import { cookies } from 'next/headers';
import { getDictionary, parseLocale } from '../../next-lib/dictionary';

export const dynamic = 'force-static';

/** SSG: aviso de privacidad publico, generado en build, sin sesion. */
export default async function PrivacidadPage() {
  const locale = parseLocale((await cookies()).get('cc_locale')?.value);
  const t = getDictionary(locale);
  const sections = [
    { title: t['privacy.data_title'], body: t['privacy.data_body'] },
    { title: t['privacy.ai_title'], body: t['privacy.ai_body'] },
    { title: t['privacy.rights_title'], body: t['privacy.rights_body'] },
  ];
  return (
    <main style={{ maxWidth: 672, margin: '0 auto', padding: '3rem 1rem' }}>
      <Link href="/">ContratoClaro</Link>
      <h1 style={{ marginTop: '0.75rem' }}>{t['privacy.title']}</h1>
      <p>{t['privacy.intro']}</p>
      {sections.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          <p>{s.body}</p>
        </section>
      ))}
    </main>
  );
}
