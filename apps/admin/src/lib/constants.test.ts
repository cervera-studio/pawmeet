import { CHART_COLORS, EVENT, FONT_SIZE, getChartColors, PAGINATION, TIMING } from './constants';

describe('PAGINATION', () => {
  it('has a default page size of 20', () => {
    expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(20);
  });
});

describe('TIMING', () => {
  it('has a debounce delay of 300ms', () => {
    expect(TIMING.DEBOUNCE_DELAY_MS).toBe(300);
  });
});

describe('FONT_SIZE', () => {
  it('follows 4px grid increments', () => {
    const sizes = Object.values(FONT_SIZE);
    for (const size of sizes) {
      expect(size % 2).toBe(0);
    }
  });

  it('has expected size values', () => {
    expect(FONT_SIZE.xs).toBe(10);
    expect(FONT_SIZE.sm).toBe(12);
    expect(FONT_SIZE.md).toBe(14);
    expect(FONT_SIZE.base).toBe(16);
    expect(FONT_SIZE.lg).toBe(20);
    expect(FONT_SIZE.xl).toBe(24);
  });
});

describe('EVENT', () => {
  it('has duration min of 15 minutes', () => {
    expect(EVENT.DURATION_MIN).toBe(15);
  });

  it('has duration max of 180 minutes', () => {
    expect(EVENT.DURATION_MAX).toBe(180);
  });

  it('min is less than max', () => {
    expect(EVENT.DURATION_MIN).toBeLessThan(EVENT.DURATION_MAX);
  });
});

describe('CHART_COLORS', () => {
  it('has light and dark themes', () => {
    expect(CHART_COLORS).toHaveProperty('light');
    expect(CHART_COLORS).toHaveProperty('dark');
  });

  it('both themes have the same keys', () => {
    const lightKeys = Object.keys(CHART_COLORS.light).sort();
    const darkKeys = Object.keys(CHART_COLORS.dark).sort();
    expect(lightKeys).toEqual(darkKeys);
  });
});

describe('getChartColors', () => {
  it('returns dark colors when isDark is true', () => {
    expect(getChartColors(true)).toBe(CHART_COLORS.dark);
  });

  it('returns light colors when isDark is false', () => {
    expect(getChartColors(false)).toBe(CHART_COLORS.light);
  });
});
