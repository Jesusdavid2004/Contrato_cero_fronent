/**
 * Narration engine on top of the Web Speech API.
 *
 * Framework-agnostic so it can be unit tested with a fake synthesizer. Each
 * narration item is spoken as one or more short utterances (browsers cut long
 * utterances) and progress is reported per item, not per word, because
 * `boundary` events are inconsistent across browsers.
 */

export interface NarrationItem {
  id: string;
  text: string;
}

export type NarratorStatus = 'idle' | 'speaking' | 'paused';

export interface NarratorState {
  status: NarratorStatus;
  activeId: string | null;
}

export interface PlayOptions {
  lang: string;
  rate: number;
}

export const MAX_UTTERANCE_LENGTH = 220;
export const DEFAULT_RATE = 1;
export const MIN_RATE = 0.7;
export const MAX_RATE = 1.4;

const SENTENCE_BOUNDARY = /(?<=[.!?…:;])\s+/;

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** Splits text on sentence boundaries into chunks no longer than `max` characters. */
export function splitForSpeech(text: string, max = MAX_UTTERANCE_LENGTH): string[] {
  const chunks: string[] = [];
  let current = '';
  const push = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };
  for (const sentence of text.split(SENTENCE_BOUNDARY)) {
    if (sentence.length > max) {
      push();
      for (const word of sentence.split(/\s+/)) {
        if ((current + ' ' + word).trim().length > max) push();
        current = `${current} ${word}`.trim();
      }
      push();
    } else if ((current + ' ' + sentence).trim().length > max) {
      push();
      current = sentence;
    } else {
      current = `${current} ${sentence}`.trim();
    }
  }
  push();
  return chunks;
}

function languageMatches(voiceLang: string, wanted: string): number {
  const voice = voiceLang.toLowerCase().replace('_', '-');
  const target = wanted.toLowerCase();
  if (voice === target) return 3;
  if (voice.startsWith(`${target}-`)) return 2;
  if (voice.split('-')[0] === target.split('-')[0]) return 1;
  return 0;
}

/** Prefers an exact locale (es-CO), then any regional variant, then local voices over network ones. */
export function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  lang: string,
  regionalPreference?: string,
): SpeechSynthesisVoice | null {
  const scored = voices
    .map((voice) => {
      const preferred = regionalPreference && voice.lang.toLowerCase().replace('_', '-') === regionalPreference.toLowerCase() ? 4 : 0;
      return { voice, score: Math.max(languageMatches(voice.lang, lang), preferred) };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.voice.localService) - Number(a.voice.localService));
  return scored[0]?.voice ?? null;
}

type Listener = (state: NarratorState) => void;

export class Narrator {
  private state: NarratorState = { status: 'idle', activeId: null };
  private run = 0;

  constructor(
    private readonly synth: SpeechSynthesis,
    private readonly listener: Listener,
    private readonly regionalPreference?: string,
  ) {}

  public getState(): NarratorState {
    return this.state;
  }

  public play(items: readonly NarrationItem[], options: PlayOptions): void {
    this.stop();
    if (items.length === 0) return;
    const run = this.run;
    const voice = pickVoice(this.synth.getVoices(), options.lang, this.regionalPreference);
    this.speakItem(items, 0, options, voice, run);
  }

  public pause(): void {
    if (this.state.status !== 'speaking') return;
    this.synth.pause();
    this.update({ ...this.state, status: 'paused' });
  }

  public resume(): void {
    if (this.state.status !== 'paused') return;
    this.synth.resume();
    this.update({ ...this.state, status: 'speaking' });
  }

  public stop(): void {
    this.run += 1;
    this.synth.cancel();
    this.update({ status: 'idle', activeId: null });
  }

  private speakItem(
    items: readonly NarrationItem[],
    index: number,
    options: PlayOptions,
    voice: SpeechSynthesisVoice | null,
    run: number,
  ): void {
    if (run !== this.run) return;
    if (index >= items.length) {
      this.update({ status: 'idle', activeId: null });
      return;
    }
    const item = items[index];
    const chunks = splitForSpeech(item.text);
    this.update({ status: 'speaking', activeId: item.id });
    const next = () => this.speakItem(items, index + 1, options, voice, run);
    this.speakChunks(chunks, 0, options, voice, run, next);
  }

  private speakChunks(
    chunks: readonly string[],
    index: number,
    options: PlayOptions,
    voice: SpeechSynthesisVoice | null,
    run: number,
    done: () => void,
  ): void {
    if (run !== this.run) return;
    if (index >= chunks.length) {
      done();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.lang = voice?.lang ?? options.lang;
    utterance.rate = Math.min(MAX_RATE, Math.max(MIN_RATE, options.rate));
    if (voice) utterance.voice = voice;
    const advance = () => this.speakChunks(chunks, index + 1, options, voice, run, done);
    utterance.onend = advance;
    utterance.onerror = () => {
      // A cancelled run is ignored (stop() already reset the state); a real error skips the chunk.
      if (run === this.run) advance();
    };
    this.synth.speak(utterance);
  }

  private update(state: NarratorState): void {
    this.state = state;
    this.listener(state);
  }
}
