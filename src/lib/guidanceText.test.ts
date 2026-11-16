import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { renderGuidanceItem } from './guidanceText';
import type { GuidanceItem } from '../services/assistant';

function item(partial: Partial<GuidanceItem> & Pick<GuidanceItem, 'message_key'>): GuidanceItem {
  return { id: 'x', kind: 'k', params: {}, clause_id: null, ...partial };
}

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('renderGuidanceItem', () => {
  it('uses the with_change variant when the clause has a suggested change', async () => {
    await i18n.changeLanguage('en');
    const withChange = renderGuidanceItem(
      item({ message_key: 'assistant.plan.resolve_high_risk_clause', params: { position: 4, hasSuggestedChange: 1 } }),
      i18n.t,
    );
    const without = renderGuidanceItem(
      item({ message_key: 'assistant.plan.resolve_high_risk_clause', params: { position: 4, hasSuggestedChange: 0 } }),
      i18n.t,
    );
    expect(withChange).toContain('suggested change');
    expect(without).not.toContain('suggested change');
    expect(withChange).toContain('clause 4');
  });

  it('pluralizes by flagged clause count in both languages', async () => {
    const key = 'assistant.plan.prepare_objection_letter';
    await i18n.changeLanguage('en');
    expect(renderGuidanceItem(item({ message_key: key, params: { flaggedCount: 1 } }), i18n.t)).toContain('1 flagged clause.');
    expect(renderGuidanceItem(item({ message_key: key, params: { flaggedCount: 3 } }), i18n.t)).toContain('3 flagged clauses.');
    await i18n.changeLanguage('es');
    expect(renderGuidanceItem(item({ message_key: key, params: { flaggedCount: 3 } }), i18n.t)).toContain('3 cláusulas señaladas');
  });

  it('translates the fact key into a readable name', async () => {
    await i18n.changeLanguage('es');
    const text = renderGuidanceItem(
      item({ message_key: 'assistant.plan.confirm_extracted_fact', params: { factKey: 'end_date' } }),
      i18n.t,
    );
    expect(text).toContain('la fecha de terminación');
  });

  it('appends the suggestion to a narrated clause only when one exists', async () => {
    await i18n.changeLanguage('en');
    const base = { position: 2, explanation: 'It renews on its own.' };
    const withSuggestion = renderGuidanceItem(
      item({ message_key: 'assistant.narration.clause_high', params: { ...base, suggestion: 'Ask for a reminder.' } }),
      i18n.t,
    );
    const withoutSuggestion = renderGuidanceItem(
      item({ message_key: 'assistant.narration.clause_high', params: { ...base, suggestion: '' } }),
      i18n.t,
    );
    expect(withSuggestion).toContain('A fairer wording would be: Ask for a reminder.');
    expect(withoutSuggestion).toBe('Clause 2 is high risk. It renews on its own.');
  });

  it('pluralizes the legal notice', async () => {
    await i18n.changeLanguage('en');
    const notice = (count: number) =>
      renderGuidanceItem(item({ id: 'legal_notice', message_key: 'assistant.narration.legal_notice', params: { count } }), i18n.t);
    expect(notice(1)).toContain('1 recent legal update may');
    expect(notice(2)).toContain('2 recent legal updates may');
  });
});
