import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import type { AssistantCitation } from '../../services/assistant';

function formatDate(value: string, language: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(parsed);
}

/** Numbered list of the sources an answer relied on, with verification date and link. */
export function CitationList({
  citations,
  anchorPrefix,
}: {
  citations: readonly AssistantCitation[];
  anchorPrefix: string;
}) {
  const { t, i18n } = useTranslation();
  if (citations.length === 0) return null;
  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
        {t('assistant.sources')}
      </p>
      <ol className="mt-1.5 space-y-1.5">
        {citations.map((citation, index) => (
          <li
            key={citation.source_id}
            id={`${anchorPrefix}-${citation.source_id}`}
            className="rounded-[10px] bg-[var(--color-surface-2)] px-3 py-2 text-[12px] leading-relaxed"
          >
            <span className="font-bold">[{index + 1}] {t(`assistant.source.${citation.kind}`)}</span>
            {citation.kind !== 'clause' && citation.kind !== 'fact' && (
              <span className="ml-1">· {citation.label}</span>
            )}
            <span className="mt-0.5 block text-[var(--color-text-muted)]">“{citation.quote}”</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--color-text-muted)]">
              {citation.verified_at && <span>{t('assistant.verified_on', { date: formatDate(citation.verified_at, i18n.language) })}</span>}
              {citation.source_url && (
                <a
                  href={citation.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[var(--color-action-text)] underline underline-offset-2"
                >
                  {t('assistant.open_source')}
                  <ExternalLink aria-hidden="true" className="h-3 w-3" />
                </a>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
