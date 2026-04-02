import { cn, translateDynamic } from './utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('deduplicates conflicting Tailwind classes', () => {
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4');
  });

  it('handles conditional classes', () => {
    const result = cn('base', false && 'hidden', 'extra');
    expect(result).toBe('base extra');
  });

  it('handles undefined and null inputs', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toBe('base end');
  });

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('');
  });

  it('merges conflicting text colors keeping last', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });
});

describe('translateDynamic', () => {
  function buildTranslator(translations: Record<string, string>) {
    const fn = ((key: never) => translations[key as string] ?? key) as {
      has: (key: string) => boolean;
    } & ((key: never) => string);
    fn.has = (key: string) => key in translations;
    return fn;
  }

  it('returns translated value when key exists', () => {
    const t = buildTranslator({ 'dogSize.small': 'Piccolo' });
    expect(translateDynamic(t, 'dogSize', 'small')).toBe('Piccolo');
  });

  it('returns raw value when key does not exist', () => {
    const t = buildTranslator({});
    expect(translateDynamic(t, 'dogSize', 'unknown_value')).toBe('unknown_value');
  });

  it('builds key from prefix and value', () => {
    const t = buildTranslator({ 'status.active': 'Attivo' });
    expect(translateDynamic(t, 'status', 'active')).toBe('Attivo');
  });
});
