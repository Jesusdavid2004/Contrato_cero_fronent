import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_RATE, Narrator, isSpeechSupported, type NarratorState } from '../lib/speech';

const IDLE_STATE: NarratorState = { status: 'idle', activeId: null };
const REGIONAL_VOICE_BY_LANGUAGE: Record<string, string> = { es: 'es-CO', en: 'en-US' };

export interface Speaker {
  supported: boolean;
  /** Id of the text currently being read, or null. */
  activeId: string | null;
  toggle: (id: string, text: string) => void;
  stop: () => void;
}

/** Reads one text aloud at a time (used for per-message "listen" buttons). */
export function useSpeaker(): Speaker {
  const { i18n } = useTranslation();
  const supported = isSpeechSupported();
  const language = i18n.language.split('-')[0];
  const [state, setState] = useState<NarratorState>(IDLE_STATE);

  const narrator = useMemo(
    () => (supported ? new Narrator(window.speechSynthesis, setState, REGIONAL_VOICE_BY_LANGUAGE[language]) : null),
    [supported, language],
  );

  useEffect(() => () => narrator?.stop(), [narrator]);

  const toggle = useCallback((id: string, text: string) => {
    if (!narrator) return;
    if (narrator.getState().activeId === id) {
      narrator.stop();
      return;
    }
    narrator.play([{ id, text }], { lang: language, rate: DEFAULT_RATE });
  }, [narrator, language]);

  const stop = useCallback(() => narrator?.stop(), [narrator]);

  return { supported, activeId: state.activeId, toggle, stop };
}
