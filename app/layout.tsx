import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import '../src/index.css';
import { parseLocale } from '../next-lib/dictionary';

export const metadata: Metadata = {
  title: 'ContratoClaro',
  description: 'Entiende clausulas riesgosas y prepara tu carta de objecion. Informacion general, no asesoria legal.',
};

const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('cc_theme')||localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}`;

/** Layout raiz: mismo tema sin flash que el SPA Vite. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const locale = parseLocale(store.get('cc_locale')?.value);
  return (
    <html lang={locale}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
