export interface Guide {
  slug: string;
  titleEs: string;
  titleEn: string;
  updatedAt: string;
  bodyEs: string[];
  bodyEn: string[];
}

/** Contenido publico aprobado para ISR (educativo, sin datos personales). */
export const GUIDES: Guide[] = [
  {
    slug: 'leer-un-arriendo',
    titleEs: 'Cómo leer un contrato de arriendo',
    titleEn: 'How to read a lease contract',
    updatedAt: '2026-11-10',
    bodyEs: [
      'Identifica precio, duración, incrementos y causales de terminación antes de firmar.',
      'Desconfía de renovaciones automáticas sin preaviso escrito.',
      'Conserva evidencia: páginas y fragmentos citados en tu análisis.',
    ],
    bodyEn: [
      'Identify price, term, increases and termination grounds before signing.',
      'Beware of automatic renewals without written notice.',
      'Keep evidence: pages and fragments quoted in your analysis.',
    ],
  },
  {
    slug: 'carta-de-objecion',
    titleEs: 'Cómo redactar tu carta de objeción',
    titleEn: 'How to write your objection letter',
    updatedAt: '2026-11-10',
    bodyEs: [
      'Elige solo los hallazgos que entiendes y quieres discutir.',
      'Pide aclaración o ajuste concreto, no declares nulidades.',
      'Guarda cada versión de tu borrador; nada se envía solo.',
    ],
    bodyEn: [
      'Select only the findings you understand and want to discuss.',
      'Ask for clarification or a concrete adjustment; do not declare nullity.',
      'Keep every draft version; nothing is sent automatically.',
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
