import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../i18n';
import { LegalUpdateNotice } from './LegalUpdateNotice';

function renderNotice(count: number) {
  return render(<MemoryRouter><LegalUpdateNotice count={count} /></MemoryRouter>);
}

describe('LegalUpdateNotice', () => {
  it('renders nothing when there are no updates', () => {
    const { container } = renderNotice(0);
    expect(container).toBeEmptyDOMElement();
  });

  it('pluralizes the message and links to the radar', async () => {
    await i18n.changeLanguage('en');
    const { unmount } = renderNotice(1);
    expect(screen.getByText('1 recent legal update may affect this contract.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See legal radar' })).toHaveAttribute('href', '/radar');
    unmount();
    renderNotice(3);
    expect(screen.getByText('3 recent legal updates may affect this contract.')).toBeInTheDocument();
  });

  it('uses Spanish when the language changes', async () => {
    await i18n.changeLanguage('es');
    renderNotice(2);
    expect(screen.getByText('2 novedades legales recientes pueden afectar este contrato.')).toBeInTheDocument();
    await i18n.changeLanguage('en');
  });
});
