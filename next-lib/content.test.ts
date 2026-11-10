import { describe, it, expect } from 'vitest';
import { getDictionary, parseLocale, translate } from './dictionary';
import { coverageRevalidateSeconds } from './site';
import { GUIDES, getGuide } from './guias';

describe('next-lib', () => {
  it('diccionario del servidor con fallback a es', () => {
    expect(getDictionary('es')['home.title']).toBeDefined();
    expect(getDictionary('en')['home.title']).toBeDefined();
    expect(getDictionary('fr')).toBe(getDictionary('es'));
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('xx')).toBe('es');
    expect(translate('es', 'missing.key')).toBe('missing.key');
  });

  it('revalidacion ISR por defecto de una hora', () => {
    expect(coverageRevalidateSeconds()).toBe(3600);
  });

  it('guias publicas aprobadas con slugs estables', () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(2);
    expect(getGuide('leer-un-arriendo')?.slug).toBe('leer-un-arriendo');
    expect(getGuide('no-existe')).toBeUndefined();
  });
});
