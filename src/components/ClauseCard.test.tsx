import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from '../i18n';
import { ClauseCard } from './ClauseCard';
import type { ContractClauseResponse } from '../services/contracts';

const CLAUSE: ContractClauseResponse = {
  id: 'k1',
  original_text: 'The agreement renews every year.',
  risk_level: 'high',
  plain_explanation: 'It renews on its own.',
  confidence: 0.9,
  why_risky: 'You may miss the deadline.',
  legal_basis: [],
  suggested_change: 'Ask for a reminder.',
};

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('ClauseCard', () => {
  it('opens a collapsed clause while it is highlighted by the narrator and marks it as current', () => {
    const { rerender } = render(<ClauseCard clause={CLAUSE} />);
    expect(screen.getByRole('button', { expanded: false })).toBeInTheDocument();
    rerender(<ClauseCard clause={CLAUSE} highlighted />);
    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument();
    expect(document.getElementById('clause-k1')).toHaveAttribute('aria-current', 'true');
  });

  it('offers to ask the assistant about this clause only when a handler is provided', () => {
    const onAsk = vi.fn();
    const { rerender } = render(<ClauseCard clause={CLAUSE} defaultOpen />);
    expect(screen.queryByRole('button', { name: /Ask the assistant/ })).not.toBeInTheDocument();
    rerender(<ClauseCard clause={CLAUSE} defaultOpen onAsk={onAsk} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ask the assistant about this clause' }));
    expect(onAsk).toHaveBeenCalledWith('k1');
  });
});
