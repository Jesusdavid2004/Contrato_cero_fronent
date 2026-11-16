import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../i18n';
import { NarratorPanel } from './NarratorPanel';
import type { GuidanceState } from '../../hooks/useGuidance';

class FakeUtterance {
  public lang = '';
  public rate = 1;
  public voice: unknown = null;
  public onend: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

const spoken: FakeUtterance[] = [];
const synth = {
  speak: vi.fn((utterance: FakeUtterance) => { spoken.push(utterance); }),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: () => [],
};

const READY: GuidanceState = {
  status: 'ready',
  guidance: {
    contract_id: 'c1',
    locale: 'es',
    global_risk_score: 80,
    pending_legal_updates: 0,
    steps: [{
      id: 'resolve_high_risk_clause:k1', kind: 'resolve_high_risk_clause', priority: 1,
      message_key: 'assistant.plan.resolve_high_risk_clause', params: { position: 2, hasSuggestedChange: 1 }, clause_id: 'k1',
    }],
    narration: [
      { id: 'intro', kind: 'intro', message_key: 'assistant.narration.intro_high', params: { score: 80, flaggedCount: 1 }, clause_id: null },
      { id: 'clause:k1', kind: 'clause', message_key: 'assistant.narration.clause_high', params: { position: 2, explanation: 'Renews on its own.', suggestion: '' }, clause_id: 'k1' },
    ],
  },
};

beforeEach(async () => {
  spoken.length = 0;
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true });
  await i18n.changeLanguage('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, 'speechSynthesis');
  vi.clearAllMocks();
});

describe('NarratorPanel', () => {
  it('lists the prioritized plan in the active language', () => {
    render(<NarratorPanel guidance={READY} onActiveClauseChange={() => undefined} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText(/Do not accept clause 2 as is: ask for the suggested change/)).toBeInTheDocument();
  });

  it('reads the script aloud and reports the narrated clause for highlighting', () => {
    const onActive = vi.fn();
    render(<NarratorPanel guidance={READY} onActiveClauseChange={onActive} />);
    fireEvent.click(screen.getByRole('button', { name: 'Listen' }));
    expect(spoken[0].text).toContain('high risk level, 80 out of 100');
    act(() => spoken.at(-1)?.onend?.());
    expect(spoken.at(-1)?.text).toContain('Clause 2 is high risk');
    expect(onActive).toHaveBeenLastCalledWith('k1');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onActive).toHaveBeenLastCalledWith(null);
  });

  it('narrates in Spanish after a runtime language switch', async () => {
    render(<NarratorPanel guidance={READY} onActiveClauseChange={() => undefined} />);
    await act(async () => { await i18n.changeLanguage('es'); });
    fireEvent.click(screen.getByRole('button', { name: 'Escuchar' }));
    expect(spoken[0].text).toContain('riesgo alto, 80 de 100');
  });

  it('explains when the browser cannot speak and still shows the plan', () => {
    Reflect.deleteProperty(window, 'speechSynthesis');
    render(<NarratorPanel guidance={READY} onActiveClauseChange={() => undefined} />);
    expect(screen.getByText(/cannot read text aloud/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Listen' })).not.toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });

  it('shows loading and error states', () => {
    const { rerender } = render(<NarratorPanel guidance={{ status: 'loading' }} onActiveClauseChange={() => undefined} />);
    expect(screen.getByRole('status')).toHaveTextContent('Preparing your walkthrough');
    rerender(<NarratorPanel guidance={{ status: 'error', errorKey: 'errors.contract_not_ready' }} onActiveClauseChange={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Wait for contract analysis');
  });

  it('shows an empty plan message when there is nothing urgent', () => {
    render(
      <NarratorPanel
        guidance={{ status: 'ready', guidance: { ...READY.guidance, steps: [], narration: [] } }}
        onActiveClauseChange={() => undefined}
      />,
    );
    expect(screen.getByText(/No urgent actions/)).toBeInTheDocument();
  });
});
