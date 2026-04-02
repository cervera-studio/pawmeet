import {
  formatDate,
  formatDateAxis,
  formatDateShort,
  formatDateTime,
  formatNumber,
} from './formatters';

describe('formatNumber', () => {
  it('formats integers as a string containing the digits', () => {
    const result = formatNumber(1234);
    // Locale formatting may or may not add separators depending on ICU data
    expect(result).toContain('1');
    expect(result).toContain('234');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats negative numbers', () => {
    const result = formatNumber(-5000);
    expect(result).toContain('5000');
  });
});

describe('formatDateShort', () => {
  it('formats a Date to short Italian format', () => {
    // 11 March 2026
    const result = formatDateShort(new Date(2026, 2, 11));
    expect(result).toMatch(/11/);
    expect(result).toMatch(/mar/i);
  });

  it('accepts an ISO string', () => {
    const result = formatDateShort('2026-03-11T10:00:00Z');
    expect(result).toMatch(/11/);
  });
});

describe('formatDate', () => {
  it('formats a Date to full Italian format', () => {
    const result = formatDate(new Date(2026, 2, 11));
    expect(result).toMatch(/11/);
    expect(result).toMatch(/marzo/i);
    expect(result).toMatch(/2026/);
  });

  it('accepts an ISO string', () => {
    const result = formatDate('2026-03-11T10:00:00Z');
    expect(result).toMatch(/2026/);
  });
});

describe('formatDateTime', () => {
  it('formats a Date with time in Italian format', () => {
    const result = formatDateTime(new Date(2026, 2, 11, 14, 30));
    expect(result).toMatch(/11/);
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/14:30/);
  });

  it('accepts an ISO string', () => {
    const result = formatDateTime('2026-07-01T08:15:00Z');
    expect(result).toMatch(/2026/);
  });
});

describe('formatDateAxis', () => {
  it('formats as day/month for chart axis', () => {
    // March is month index 2 -> displayed as 3
    const result = formatDateAxis('2026-03-11');
    expect(result).toBe('11/3');
  });

  it('formats January correctly', () => {
    const result = formatDateAxis('2026-01-05');
    expect(result).toBe('5/1');
  });

  it('formats December correctly', () => {
    const result = formatDateAxis('2026-12-25');
    expect(result).toBe('25/12');
  });
});
