import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type RecognitionConstructor = new () => Recognition;

const RECOGNITION_LOCALE: Record<string, string> = { es: 'es-CO', en: 'en-US' };

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export interface SpeechInput {
  supported: boolean;
  listening: boolean;
  start: (onTranscript: (text: string) => void) => void;
  stop: () => void;
}

/** Dictation for the question box, in the active UI language. Absent in browsers without recognition. */
export function useSpeechInput(): SpeechInput {
  const { i18n } = useTranslation();
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const Constructor = recognitionConstructor();
  const language = i18n.language.split('-')[0];

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const stop = useCallback(() => recognitionRef.current?.stop(), []);

  const start = useCallback((onTranscript: (text: string) => void) => {
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.lang = RECOGNITION_LOCALE[language] ?? language;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(' ').trim();
      if (transcript) onTranscript(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [Constructor, language]);

  return { supported: Constructor !== null, listening, start, stop };
}
