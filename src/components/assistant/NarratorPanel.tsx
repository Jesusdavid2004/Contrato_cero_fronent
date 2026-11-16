import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ListChecks, Pause, Play, Square, Volume2 } from 'lucide-react';
import { useNarration } from '../../hooks/useNarration';
import { renderGuidanceItem } from '../../lib/guidanceText';
import { MAX_RATE, MIN_RATE } from '../../lib/speech';
import type { GuidanceState } from '../../hooks/useGuidance';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';

const RATE_STEP = 0.1;

export function NarratorPanel({
  guidance,
  onActiveClauseChange,
}: {
  guidance: GuidanceState;
  /** Receives the clause being narrated (or null) so the page can highlight it. */
  onActiveClauseChange: (clauseId: string | null) => void;
}) {
  const { t } = useTranslation();
  const ready = guidance.status === 'ready' ? guidance.guidance : null;

  const texts = useMemo(
    () => (ready ? ready.narration.map((item) => ({ id: item.id, text: renderGuidanceItem(item, t), clauseId: item.clause_id })) : []),
    // `t` changes identity when the language changes, which re-renders the script in the new language.
    [ready, t],
  );
  const narration = useNarration(texts);
  const activeClauseId = texts.find((item) => item.id === narration.state.activeId)?.clauseId ?? null;
  const activeText = texts.find((item) => item.id === narration.state.activeId)?.text ?? null;

  useEffect(() => {
    onActiveClauseChange(activeClauseId);
  }, [activeClauseId, onActiveClauseChange]);

  const speaking = narration.state.status === 'speaking';
  const paused = narration.state.status === 'paused';

  return (
    <Panel className="space-y-4 p-5! sm:p-6!" aria-labelledby="narrator-heading">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-action-soft)] text-[var(--color-action-text)]">
            <Volume2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 id="narrator-heading" className="text-[18px] font-bold tracking-tight">{t('assistant.narrator.title')}</h2>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">{t('assistant.narrator.subtitle')}</p>
          </div>
        </div>

        {ready && narration.supported && (
          <div className="flex flex-wrap items-center gap-2">
            {!speaking && !paused && (
              <Button onClick={narration.play} icon={<Play aria-hidden="true" className="h-4 w-4" />}>
                {t('assistant.narrator.play')}
              </Button>
            )}
            {speaking && (
              <Button variant="secondary" onClick={narration.pause} icon={<Pause aria-hidden="true" className="h-4 w-4" />}>
                {t('assistant.narrator.pause')}
              </Button>
            )}
            {paused && (
              <Button onClick={narration.resume} icon={<Play aria-hidden="true" className="h-4 w-4" />}>
                {t('assistant.narrator.resume')}
              </Button>
            )}
            {(speaking || paused) && (
              <Button variant="secondary" onClick={narration.stop} icon={<Square aria-hidden="true" className="h-4 w-4" />}>
                {t('assistant.narrator.stop')}
              </Button>
            )}
          </div>
        )}
      </header>

      {guidance.status === 'loading' && (
        <p role="status" className="text-[13px] text-[var(--color-text-muted)]">{t('assistant.narrator.loading')}</p>
      )}
      {guidance.status === 'error' && (
        <p role="alert" className="text-[13px] font-medium text-[var(--color-risk-high-text)]">
          {t(guidance.errorKey)}
        </p>
      )}

      {ready && !narration.supported && (
        <p className="text-[13px] text-[var(--color-text-muted)]">{t('assistant.narrator.unsupported')}</p>
      )}

      {ready && narration.supported && (
        <label className="flex items-center gap-3 text-[13px] font-semibold">
          {t('assistant.narrator.speed')}
          <input
            type="range"
            min={MIN_RATE}
            max={MAX_RATE}
            step={RATE_STEP}
            value={narration.rate}
            onChange={(event) => narration.setRate(Number(event.target.value))}
            className="w-40 accent-[var(--color-action)]"
          />
          <span className="tabular-nums text-[var(--color-text-muted)]">
            {t('assistant.narrator.speed_value', { value: narration.rate.toFixed(1) })}
          </span>
        </label>
      )}

      {activeText && (
        <p aria-live="polite" className="rounded-[14px] bg-[var(--color-action-soft)] p-3.5 text-[14px] leading-relaxed text-[var(--color-text)]">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--color-action-text)]">
            {t('assistant.narrator.now_reading')}
          </span>
          {activeText}
        </p>
      )}

      {ready && (
        <section aria-labelledby="plan-heading">
          <h3 id="plan-heading" className="flex items-center gap-2 text-[14px] font-bold">
            <ListChecks aria-hidden="true" className="h-4 w-4" />
            {t('assistant.plan.title')}
          </h3>
          {ready.steps.length === 0 ? (
            <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">{t('assistant.plan.empty')}</p>
          ) : (
            <ol className="mt-2 space-y-2">
              {ready.steps.map((step) => (
                <li
                  key={step.id}
                  className="flex gap-3 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-[14px] leading-relaxed"
                >
                  <span className="shrink-0 text-[12px] font-bold text-[var(--color-action-text)]">
                    {t('assistant.plan.step_number', { priority: step.priority })}
                  </span>
                  <span>{renderGuidanceItem(step, t)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </Panel>
  );
}
