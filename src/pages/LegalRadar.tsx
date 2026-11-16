import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Newspaper, ScrollText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLegalUpdates } from '../hooks/useLegalUpdates';
import { Panel } from '../components/ui/Panel';
import type { LegalUpdate } from '../services/assistant';

const KNOWN_TEMAS = ['arriendo', 'consumo'] as const;
const ALL_TEMAS = '';

function UpdateItem({ update }: { update: LegalUpdate }) {
  const { t, i18n } = useTranslation();
  const isNorm = update.kind === 'norm_change';
  const Icon = isNorm ? ScrollText : Newspaper;
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long' }).format(new Date(update.detected_at));
  return (
    <li className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
            isNorm
              ? 'bg-[var(--color-risk-medium-bg)] text-[var(--color-risk-medium-text)]'
              : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
          }`}
        >
          <Icon aria-hidden="true" className="h-3.5 w-3.5" />
          {t(`radar.kind.${update.kind}`)}
        </span>
        <span className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[var(--color-text-muted)]">
          {t(`radar.tema.${update.tema}`, update.tema)}
        </span>
        <span className="font-medium text-[var(--color-text-muted)]">{t('radar.detected_on', { date })}</span>
      </div>
      <p className="mt-2 text-[15px] font-semibold leading-snug">{update.title}</p>
      <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">{t(`radar.kind_hint.${update.kind}`)}</p>
      <a
        href={update.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--color-action-text)] underline underline-offset-2"
      >
        {t('radar.open_source')}
        <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
      </a>
    </li>
  );
}

export function LegalRadar() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [tema, setTema] = useState(ALL_TEMAS);
  const state = useLegalUpdates(token, tema || undefined);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">{t('radar.title')}</h1>
        <p className="mt-1 text-[14px] text-[var(--color-text-muted)]">{t('radar.subtitle')}</p>
      </div>

      <Panel className="space-y-4">
        <label className="flex flex-wrap items-center gap-3 text-[13px] font-semibold">
          {t('radar.filter_label')}
          <select
            value={tema}
            onChange={(event) => setTema(event.target.value)}
            className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[14px] font-normal focus:border-[var(--color-action)] focus:outline-none"
          >
            <option value={ALL_TEMAS}>{t('radar.filter_all')}</option>
            {KNOWN_TEMAS.map((known) => (
              <option key={known} value={known}>{t(`radar.tema.${known}`)}</option>
            ))}
          </select>
        </label>

        {state.status === 'loading' && (
          <p role="status" className="text-[14px] text-[var(--color-text-muted)]">{t('radar.loading')}</p>
        )}
        {state.status === 'error' && (
          <p role="alert" className="text-[14px] font-medium text-[var(--color-risk-high-text)]">{t('radar.error')}</p>
        )}
        {state.status === 'ready' && state.updates.length === 0 && (
          <p className="text-[14px] text-[var(--color-text-muted)]">{t('radar.empty')}</p>
        )}
        {state.status === 'ready' && state.updates.length > 0 && (
          <ul className="space-y-3">
            {state.updates.map((update) => <UpdateItem key={update.id} update={update} />)}
          </ul>
        )}
      </Panel>
    </div>
  );
}
