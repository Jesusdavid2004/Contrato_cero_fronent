import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import { AssistantPanel } from './AssistantPanel';
import {
  askAssistant,
  clearAssistantConversation,
  listAssistantMessages,
  type AssistantMessage,
} from '../../services/assistant';
import { ContractApiError } from '../../services/contracts';

vi.mock('../../services/assistant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/assistant')>();
  return {
    ...actual,
    askAssistant: vi.fn(),
    clearAssistantConversation: vi.fn(),
    listAssistantMessages: vi.fn(),
  };
});

function message(partial: Partial<AssistantMessage> & Pick<AssistantMessage, 'id' | 'role' | 'content'>): AssistantMessage {
  return {
    contract_id: 'c1',
    citations: [],
    grounded: true,
    created_at: '2026-11-16T10:00:00.000Z',
    ...partial,
  };
}

const ANSWER = message({
  id: 'a1',
  role: 'assistant',
  content: 'The rent cannot rise freely [S1].',
  citations: [{
    source_id: 'S1', kind: 'legal', label: 'Ley 820 de 2003, Art. 20', quote: 'El canon se reajusta una vez al año.',
    source_url: 'https://example.test/ley-820', verified_at: '2026-11-03',
  }],
});

beforeEach(async () => {
  vi.mocked(listAssistantMessages).mockReset().mockResolvedValue([]);
  vi.mocked(askAssistant).mockReset();
  vi.mocked(clearAssistantConversation).mockReset().mockResolvedValue();
  await i18n.changeLanguage('en');
});

describe('AssistantPanel', () => {
  it('shows suggested questions and sends one when clicked', async () => {
    vi.mocked(askAssistant).mockImplementation(async (_id, _question, _token, callbacks) => {
      callbacks.onToken('The rent ');
      return ANSWER;
    });
    render(<AssistantPanel contractId="c1" token="tok" />);
    fireEvent.click(await screen.findByRole('button', { name: 'What should I do first?' }));
    await waitFor(() => expect(askAssistant).toHaveBeenCalledWith('c1', 'What should I do first?', 'tok', expect.anything()));
    expect(await screen.findByText(/The rent cannot rise freely/)).toBeInTheDocument();
  });

  it('renders citations as numbered links with the source, verification date and external link', async () => {
    vi.mocked(listAssistantMessages).mockResolvedValue([
      message({ id: 'u1', role: 'user', content: 'Can the rent rise?' }),
      ANSWER,
    ]);
    render(<AssistantPanel contractId="c1" token="tok" />);
    expect(await screen.findByRole('link', { name: '[1]' })).toHaveAttribute('href', '#cite-a1-S1');
    expect(screen.getByText(/Ley 820 de 2003, Art. 20/)).toBeInTheDocument();
    expect(screen.getByText(/Verified on/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open source/ })).toHaveAttribute('href', 'https://example.test/ley-820');
  });

  it('warns when an answer is not backed by the contract data', async () => {
    vi.mocked(listAssistantMessages).mockResolvedValue([
      message({ id: 'a2', role: 'assistant', content: 'I have no information.', grounded: false }),
    ]);
    render(<AssistantPanel contractId="c1" token="tok" />);
    expect(await screen.findByText(/Not backed by your contract data/)).toBeInTheDocument();
  });

  it('shows a translated error when the daily quota is exceeded', async () => {
    vi.mocked(askAssistant).mockRejectedValue(new ContractApiError('errors.assistant_quota_exceeded'));
    render(<AssistantPanel contractId="c1" token="tok" />);
    const input = await screen.findByLabelText('Your question about this contract');
    fireEvent.change(input, { target: { value: 'Hello?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('daily limit of assistant messages');
  });

  it('sends with Enter, keeps Shift+Enter for new lines and ignores blank input', async () => {
    vi.mocked(askAssistant).mockResolvedValue(ANSWER);
    render(<AssistantPanel contractId="c1" token="tok" />);
    const input = await screen.findByLabelText('Your question about this contract');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(askAssistant).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'First line' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(askAssistant).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(askAssistant).toHaveBeenCalledTimes(1));
    expect(input).toHaveValue('');
  });

  it('asks about a specific clause once, and again when requested again', async () => {
    vi.mocked(askAssistant).mockResolvedValue(ANSWER);
    const { rerender } = render(<AssistantPanel contractId="c1" token="tok" clauseQuestion={{ clauseId: 'k7', position: 3, nonce: 1 }} />);
    await waitFor(() => expect(askAssistant).toHaveBeenCalledTimes(1));
    expect(askAssistant).toHaveBeenCalledWith(
      'c1',
      'Explain clause 3 to me and tell me what I should do about it.',
      'tok',
      expect.objectContaining({ clauseId: 'k7' }),
    );
    rerender(<AssistantPanel contractId="c1" token="tok" clauseQuestion={{ clauseId: 'k7', position: 3, nonce: 1 }} />);
    expect(askAssistant).toHaveBeenCalledTimes(1);
    await screen.findByText(/The rent cannot rise freely/);
    rerender(<AssistantPanel contractId="c1" token="tok" clauseQuestion={{ clauseId: 'k7', position: 3, nonce: 2 }} />);
    await waitFor(() => expect(askAssistant).toHaveBeenCalledTimes(2));
  });

  it('clears the conversation', async () => {
    vi.mocked(listAssistantMessages).mockResolvedValue([ANSWER]);
    render(<AssistantPanel contractId="c1" token="tok" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clear conversation' }));
    await waitFor(() => expect(clearAssistantConversation).toHaveBeenCalledWith('c1', 'tok'));
    await waitFor(() => expect(screen.queryByText(/The rent cannot rise freely/)).not.toBeInTheDocument());
  });

  it('offers to retry when the history cannot be loaded', async () => {
    vi.mocked(listAssistantMessages).mockRejectedValueOnce(new Error('network'));
    render(<AssistantPanel contractId="c1" token="tok" />);
    expect(await screen.findByText(/previous conversation could not be loaded/)).toBeInTheDocument();
    vi.mocked(listAssistantMessages).mockResolvedValue([ANSWER]);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/The rent cannot rise freely/)).toBeInTheDocument();
  });

  it('follows the language switch', async () => {
    render(<AssistantPanel contractId="c1" token="tok" />);
    await screen.findByRole('button', { name: 'What should I do first?' });
    await i18n.changeLanguage('es');
    expect(await screen.findByRole('button', { name: '¿Qué debo hacer primero?' })).toBeInTheDocument();
  });
});
