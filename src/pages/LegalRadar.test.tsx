import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthContext, type AuthContextType } from '../context/AuthContext';
import i18n from '../i18n';
import { LegalRadar } from './LegalRadar';
import { listLegalUpdates, type LegalUpdate } from '../services/assistant';
import { ContractApiError } from '../services/contracts';

vi.mock('../services/assistant', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/assistant')>();
  return { ...actual, listLegalUpdates: vi.fn() };
});

const auth: AuthContextType = {
  user: { id: 'u1', name: 'Alex', email: 'a@example.test' },
  token: 'tok',
  login: vi.fn() as unknown as AuthContextType['login'],
  register: vi.fn() as unknown as AuthContextType['register'],
  logout: vi.fn(),
  isLoading: false,
  isRestoring: false,
  error: null,
  clearError: () => undefined,
};

const NORM: LegalUpdate = {
  id: 'u1', source_id: 's1', tema: 'arriendo', kind: 'norm_change',
  title: 'Ley 820 de 2003 (Gestor Normativo)', source_url: 'https://example.test/ley', detected_at: '2026-11-10T12:00:00.000Z',
};
const NEWS: LegalUpdate = {
  ...NORM, id: 'u2', kind: 'news', tema: 'consumo', title: 'Nuevo decreto para consumidores', source_url: 'https://example.test/news',
};

function renderPage() {
  return render(<AuthContext.Provider value={auth}><LegalRadar /></AuthContext.Provider>);
}

beforeEach(async () => {
  vi.mocked(listLegalUpdates).mockReset();
  await i18n.changeLanguage('en');
});

describe('LegalRadar page', () => {
  it('lists updates with a text label for their kind and a link to the source', async () => {
    vi.mocked(listLegalUpdates).mockResolvedValue([NORM, NEWS]);
    renderPage();
    expect(await screen.findByText('Ley 820 de 2003 (Gestor Normativo)')).toBeInTheDocument();
    expect(screen.getByText('Official text changed')).toBeInTheDocument();
    expect(screen.getByText('News')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Open source/ })[0]).toHaveAttribute('href', 'https://example.test/ley');
  });

  it('shows the empty state', async () => {
    vi.mocked(listLegalUpdates).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/No legal changes detected/)).toBeInTheDocument();
  });

  it('shows an error state', async () => {
    vi.mocked(listLegalUpdates).mockRejectedValue(new ContractApiError('errors.api_error'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Legal updates could not be loaded');
  });

  it('refetches with the selected topic', async () => {
    vi.mocked(listLegalUpdates).mockResolvedValue([NORM]);
    renderPage();
    await screen.findByText(NORM.title);
    fireEvent.change(screen.getByLabelText('Filter by topic'), { target: { value: 'consumo' } });
    await waitFor(() => expect(listLegalUpdates).toHaveBeenLastCalledWith('tok', 'consumo'));
  });

  it('formats dates with the active language', async () => {
    vi.mocked(listLegalUpdates).mockResolvedValue([NORM]);
    await i18n.changeLanguage('es');
    renderPage();
    expect(await screen.findByText(/Detectado el 10 de noviembre de 2026/)).toBeInTheDocument();
  });
});
