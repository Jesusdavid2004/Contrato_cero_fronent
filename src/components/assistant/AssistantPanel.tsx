import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Mic, MicOff, Send, Sparkles, Trash2, Volume2, VolumeX } from 'lucide-react';
import { useAssistantChat } from '../../hooks/useAssistantChat';
import { useSpeaker } from '../../hooks/useSpeaker';
import { useSpeechInput } from '../../hooks/useSpeechInput';
import type { AssistantMessage } from '../../services/assistant';
import { Button, IconButton } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { CitationList } from './CitationList';
import { MessageContent } from './MessageContent';

const QUESTION_MAX_LENGTH = 1000;
const SUGGESTED_QUESTION_KEYS = [
  'assistant.suggested.what_to_do',
  'assistant.suggested.riskiest',
  'assistant.suggested.deadlines',
  'assistant.suggested.law_changes',
] as const;

function stripMarkers(text: string): string {
  return text.replace(/\[S\d+\]/g, '').replace(/\s{2,}/g, ' ').trim();
}

function Bubble({
  message,
  speaker,
}: {
  message: AssistantMessage;
  speaker: ReturnType<typeof useSpeaker>;
}) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const anchorPrefix = `cite-${message.id}`;
  const reading = speaker.activeId === message.id;
  return (
    <li className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[92%] rounded-[16px] px-4 py-3 text-[14px] leading-relaxed ${
          isUser
            ? 'bg-[var(--color-action)] text-white'
            : 'border border-[var(--color-border)] bg-[var(--color-surface)]'
        }`}
      >
        <p className={`mb-1 text-[11px] font-bold uppercase tracking-wider ${isUser ? 'text-white/80' : 'text-[var(--color-text-muted)]'}`}>
          {isUser ? t('assistant.you') : t('assistant.assistant')}
        </p>
        <div className="space-y-2">
          <MessageContent text={message.content} citations={message.citations} anchorPrefix={anchorPrefix} />
        </div>
        {!isUser && !message.grounded && (
          <p className="mt-2 flex items-start gap-1.5 text-[12px] font-medium text-[var(--color-risk-medium-text)]">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('assistant.not_grounded')}
          </p>
        )}
        {!isUser && <CitationList citations={message.citations} anchorPrefix={anchorPrefix} />}
        {!isUser && speaker.supported && (
          <div className="mt-2 flex justify-end">
            <IconButton
              label={reading ? t('assistant.narrator.stop') : t('assistant.narrator.play')}
              onClick={() => speaker.toggle(message.id, stripMarkers(message.content))}
              aria-pressed={reading}
            >
              {reading ? <VolumeX aria-hidden="true" className="h-4 w-4" /> : <Volume2 aria-hidden="true" className="h-4 w-4" />}
            </IconButton>
          </div>
        )}
      </div>
    </li>
  );
}

export function AssistantPanel({ contractId, token }: { contractId: string; token: string | null }) {
  const { t } = useTranslation();
  const chat = useAssistantChat(contractId, token);
  const speaker = useSpeaker();
  const dictation = useSpeechInput();
  const [question, setQuestion] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);
  const busy = chat.status === 'streaming';

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [chat.messages.length, chat.draft]);

  const submit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setQuestion('');
    await chat.send(trimmed);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(question);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit(question);
    }
  };

  const toggleDictation = () => {
    if (dictation.listening) dictation.stop();
    else dictation.start(setQuestion);
  };

  return (
    <Panel className="flex flex-col gap-4 p-5! sm:p-6!" aria-labelledby="assistant-heading">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--color-action-soft)] text-[var(--color-action-text)]">
            <Sparkles aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 id="assistant-heading" className="text-[18px] font-bold tracking-tight">{t('assistant.title')}</h2>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">{t('assistant.subtitle')}</p>
          </div>
        </div>
        {chat.messages.length > 0 && (
          <IconButton label={t('assistant.clear')} onClick={() => void chat.clear()} disabled={busy}>
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </IconButton>
        )}
      </header>

      {chat.status === 'loading_history' && (
        <p role="status" className="text-[13px] text-[var(--color-text-muted)]">{t('assistant.history_loading')}</p>
      )}
      {chat.historyFailed && (
        <p role="alert" className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--color-risk-high-text)]">
          {t('assistant.history_error')}
          <Button variant="secondary" onClick={chat.reloadHistory}>{t('assistant.retry')}</Button>
        </p>
      )}

      {chat.status !== 'loading_history' && chat.messages.length === 0 && !busy && (
        <div>
          <p className="text-[13px] font-semibold text-[var(--color-text-muted)]">{t('assistant.empty')}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {SUGGESTED_QUESTION_KEYS.map((key) => (
              <li key={key} className="list-none">
                <button
                  type="button"
                  onClick={() => void submit(t(key))}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-2 text-left text-[13px] font-medium transition-colors hover:border-[var(--color-action)] hover:text-[var(--color-action-text)]"
                >
                  {t(key)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul role="log" aria-live="polite" aria-label={t('assistant.title')} className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto pr-1">
        {chat.messages.map((message) => (
          <Bubble key={message.id} message={message} speaker={speaker} />
        ))}
        {busy && (
          <li className="flex justify-start">
            <div className="max-w-[92%] rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] leading-relaxed">
              {chat.draft ? <p className="whitespace-pre-wrap">{chat.draft}</p> : (
                <p className="text-[var(--color-text-muted)]">{t('assistant.sending')}</p>
              )}
            </div>
          </li>
        )}
        <div ref={endRef} />
      </ul>

      {chat.errorKey && (
        <p role="alert" className="flex items-start gap-1.5 text-[13px] font-medium text-[var(--color-risk-high-text)]">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {t(chat.errorKey)}
        </p>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <label htmlFor="assistant-question" className="sr-only">{t('assistant.input_label')}</label>
        <textarea
          id="assistant-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          maxLength={QUESTION_MAX_LENGTH}
          placeholder={t('assistant.placeholder')}
          disabled={!token}
          className="min-h-[3rem] flex-1 resize-none rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[14px] focus:border-[var(--color-action)] focus:outline-none"
        />
        {dictation.supported && (
          <IconButton
            type="button"
            label={dictation.listening ? t('assistant.narrator.stop') : t('assistant.dictate')}
            onClick={toggleDictation}
            aria-pressed={dictation.listening}
            className="border border-[var(--color-border)]"
          >
            {dictation.listening ? <MicOff aria-hidden="true" className="h-5 w-5" /> : <Mic aria-hidden="true" className="h-5 w-5" />}
          </IconButton>
        )}
        <Button type="submit" loading={busy} disabled={!token || !question.trim()} icon={<Send aria-hidden="true" className="h-4 w-4" />}>
          {busy ? t('assistant.sending') : t('assistant.send')}
        </Button>
      </form>

      <p className="text-[12px] leading-relaxed text-[var(--color-text-muted)]">{t('assistant.disclaimer')}</p>
    </Panel>
  );
}
