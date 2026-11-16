import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Narrator, pickVoice, splitForSpeech, type NarratorState } from './speech';

class FakeUtterance {
  public lang = '';
  public rate = 1;
  public voice: unknown = null;
  public onend: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

class FakeSynth {
  public spoken: FakeUtterance[] = [];
  public cancelled = 0;
  public paused = false;
  public voices: SpeechSynthesisVoice[] = [];
  getVoices() { return this.voices; }
  speak(utterance: FakeUtterance) { this.spoken.push(utterance); }
  cancel() { this.cancelled += 1; }
  pause() { this.paused = true; }
  resume() { this.paused = false; }
  finishCurrent() { this.spoken.at(-1)?.onend?.(); }
}

function voice(lang: string, localService = true): SpeechSynthesisVoice {
  return { lang, localService, name: `${lang}-${localService}`, default: false, voiceURI: lang } as SpeechSynthesisVoice;
}

beforeEach(() => {
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
});

describe('splitForSpeech', () => {
  it('keeps short text in one chunk and splits on sentence boundaries when long', () => {
    expect(splitForSpeech('Hola. Adios.')).toEqual(['Hola. Adios.']);
    const sentence = 'Esta es una frase de prueba bastante larga para el narrador.';
    const chunks = splitForSpeech(`${sentence} ${sentence} ${sentence} ${sentence}`, 130);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 130)).toBe(true);
  });

  it('breaks a single very long sentence on word boundaries', () => {
    const chunks = splitForSpeech('palabra '.repeat(80).trim(), 100);
    expect(chunks.every((chunk) => chunk.length <= 100)).toBe(true);
    expect(chunks.join(' ')).toBe('palabra '.repeat(80).trim());
  });

  it('returns nothing for blank text', () => {
    expect(splitForSpeech('   ')).toEqual([]);
  });
});

describe('pickVoice', () => {
  it('prefers the regional voice, then a local voice of the language, then null', () => {
    const voices = [voice('es-ES'), voice('es-CO', false), voice('es-MX'), voice('en-US')];
    expect(pickVoice(voices, 'es', 'es-CO')?.lang).toBe('es-CO');
    expect(pickVoice(voices, 'es')?.lang).toBe('es-ES');
    expect(pickVoice([voice('en-US')], 'es')).toBeNull();
  });

  it('prefers a local service voice over a network one for the same language', () => {
    const voices = [voice('es-MX', false), voice('es-ES', true)];
    expect(pickVoice(voices, 'es')?.localService).toBe(true);
  });
});

describe('Narrator', () => {
  function build() {
    const synth = new FakeSynth();
    const states: NarratorState[] = [];
    const narrator = new Narrator(synth as unknown as SpeechSynthesis, (state) => states.push(state), 'es-CO');
    return { synth, states, narrator };
  }

  it('speaks items in order and reports the active item until finished', () => {
    const { synth, states, narrator } = build();
    narrator.play([{ id: 'a', text: 'Uno.' }, { id: 'b', text: 'Dos.' }], { lang: 'es', rate: 1 });
    expect(narrator.getState()).toEqual({ status: 'speaking', activeId: 'a' });
    synth.finishCurrent();
    expect(narrator.getState().activeId).toBe('b');
    synth.finishCurrent();
    expect(narrator.getState()).toEqual({ status: 'idle', activeId: null });
    expect(states.map((state) => state.activeId)).toContain('b');
  });

  it('clamps the speech rate to a comfortable range', () => {
    const { synth, narrator } = build();
    narrator.play([{ id: 'a', text: 'Hola.' }], { lang: 'es', rate: 9 });
    expect(synth.spoken[0].rate).toBe(1.4);
  });

  it('pauses, resumes and stops', () => {
    const { synth, narrator } = build();
    narrator.play([{ id: 'a', text: 'Hola.' }], { lang: 'es', rate: 1 });
    narrator.pause();
    expect(narrator.getState().status).toBe('paused');
    expect(synth.paused).toBe(true);
    narrator.resume();
    expect(narrator.getState().status).toBe('speaking');
    narrator.stop();
    expect(narrator.getState()).toEqual({ status: 'idle', activeId: null });
  });

  it('ignores late events from a stopped run so it cannot resume speaking', () => {
    const { synth, narrator } = build();
    narrator.play([{ id: 'a', text: 'Uno.' }, { id: 'b', text: 'Dos.' }], { lang: 'es', rate: 1 });
    const stale = synth.spoken[0];
    narrator.stop();
    stale.onend?.();
    expect(synth.spoken).toHaveLength(1);
    expect(narrator.getState().status).toBe('idle');
  });

  it('skips a chunk that errors and keeps narrating', () => {
    const { synth, narrator } = build();
    narrator.play([{ id: 'a', text: 'Uno.' }, { id: 'b', text: 'Dos.' }], { lang: 'es', rate: 1 });
    synth.spoken[0].onerror?.();
    expect(narrator.getState().activeId).toBe('b');
  });

  it('does nothing for an empty playlist', () => {
    const { synth, narrator } = build();
    narrator.play([], { lang: 'es', rate: 1 });
    expect(synth.spoken).toHaveLength(0);
  });
});
