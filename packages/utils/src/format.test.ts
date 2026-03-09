import { describe, it, expect, vi } from 'vitest';
import { formatDogAge } from './format';

describe('formatDogAge', () => {
  it('formats months for puppies under 1 year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-09'));

    expect(formatDogAge(new Date('2025-12-09'))).toBe('3 mesi');
    expect(formatDogAge(new Date('2025-09-09'))).toBe('6 mesi');

    vi.useRealTimers();
  });

  it('formats exact years', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-09'));

    expect(formatDogAge(new Date('2025-03-09'))).toBe('1 anno');
    expect(formatDogAge(new Date('2023-03-09'))).toBe('3 anni');

    vi.useRealTimers();
  });

  it('formats years and months', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-09'));

    expect(formatDogAge(new Date('2024-09-09'))).toBe('1 anno e 6 mesi');
    expect(formatDogAge(new Date('2023-12-09'))).toBe('2 anni e 3 mesi');

    vi.useRealTimers();
  });
});
