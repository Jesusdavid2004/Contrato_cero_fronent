import es from '../src/locales/es.json';
import en from '../src/locales/en.json';

export type UILocale = 'es' | 'en';

type Dictionary = Record<string, string>;

const dictionaries: Record<UILocale, Dictionary> = {
  es: es as Dictionary,
  en: en as Dictionary,
};

export function parseLocale(value: unknown): UILocale {
  return value === 'en' ? 'en' : 'es';
}

/** Diccionario del servidor (sin i18next): las paginas estaticas no tocan sesion. */
export function getDictionary(locale: string): Dictionary {
  return dictionaries[parseLocale(locale)];
}

export function translate(locale: string, key: string): string {
  return getDictionary(locale)[key] ?? key;
}
