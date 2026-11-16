import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_RATE,
  Narrator,
  isSpeechSupported,
  type NarrationItem,
  type NarratorState,
} from '../lib/speech';

const IDLE_STATE: NarratorState = { status: 'idle', activeId: null };
const REGIONAL_VOICE_BY_LANGUAGE: Record<string, string> = { es: 'es-CO', en: 'en-US' };

export interface NarrationControls {
  supported: boolean;
  state: NarratorState;
  rate: number;
  setRate: (rate: number) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

/**
 * Drives the speech narrator for a playlist. The playlist is already translated
 * by the caller; the voice follows the active UI language. Speech stops when the
 * component unmounts or the language changes so audio never outlives its text.
 */
export function useNarration(items: readonly NarrationItem[]): NarrationControls {
  const { i18n } = useTranslation();
  const supported = isSpeechSupported();
  const [state, setState] = useState<NarratorState>(IDLE_STATE);
  const [rate, setRate] = useState(DEFAULT_RATE);
  const language = i18n.language.split('-')[0];
  const narratorRef = useRef<Narrator | null>(null);

  const narrator = useMemo(() => {
    if (!supported) return null;
    return new Narrator(window.speechSynthesis, setState, REGIONAL_VOICE_BY_LANGUAGE[language]);
  }, [supported, language]);

  useEffect(() => {
    narratorRef.current = narrator;
    return () => {
      narrator?.stop();
    };
  }, [narrator]);

  const play = useCallback(() => narratorRef.current?.play(items, { lang: language, rate }), [items, language, rate]);
  const pause = useCallback(() => narratorRef.current?.pause(), []);
  const resume = useCallback(() => narratorRef.current?.resume(), []);
  const stop = useCallback(() => narratorRef.current?.stop(), []);

  return { supported, state, rate, setRate, play, pause, resume, stop };
}
