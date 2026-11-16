import type { TFunction } from 'i18next';
import type { GuidanceItem } from '../services/assistant';

/**
 * Turns a backend guidance item (message key + params) into translated text.
 * The backend never sends prose; it sends keys, and the language is whatever the
 * user is currently using, so the narration follows a runtime language switch.
 */

const WITH_CHANGE_CONTEXT = 'with_change';
const WITH_SUGGESTION_CONTEXT = 'with_suggestion';

function optionsFor(item: GuidanceItem, t: TFunction): Record<string, unknown> {
  const options: Record<string, unknown> = { ...item.params };
  if (typeof item.params.factKey === 'string') {
    options.fact = t(`assistant.fact.${item.params.factKey}`);
  }
  if (typeof item.params.flaggedCount === 'number') options.count = item.params.flaggedCount;
  if (item.id === 'legal_notice' && typeof item.params.count === 'number') options.count = item.params.count;
  if (item.params.hasSuggestedChange === 1) options.context = WITH_CHANGE_CONTEXT;
  if (typeof item.params.suggestion === 'string' && item.params.suggestion.trim()) {
    options.context = WITH_SUGGESTION_CONTEXT;
  }
  return options;
}

export function renderGuidanceItem(item: GuidanceItem, t: TFunction): string {
  // Plural keys (prepare_objection_letter, legal_notice) are resolved by i18next from `count`.
  return t(item.message_key, optionsFor(item, t)) as string;
}
