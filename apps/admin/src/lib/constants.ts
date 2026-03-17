// ── Pagination ────────────────────────────────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
} as const;

// ── Timing ────────────────────────────────────────────────────────────────────

export const TIMING = {
  DEBOUNCE_DELAY_MS: 300,
} as const;

// ── Typography (from @pawmeet/design-tokens, 4px grid) ───────────────────────

export const FONT_SIZE = {
  /** 10px — chart bucket labels, tiny captions */
  xs: 10,
  /** 12px — chart axis ticks, small labels */
  sm: 12,
  /** 14px — body text */
  md: 14,
  /** 16px — headings, body-lg */
  base: 16,
  /** 20px — heading-md */
  lg: 20,
  /** 24px — heading-lg */
  xl: 24,
} as const;

// ── Chart colors ──────────────────────────────────────────────────────────────

export const CHART_COLORS = {
  light: {
    grid: '#e5e5e5',
    text: '#4A4A5A',
    tooltipBg: '#ffffff',
    registrations: { stroke: '#065F46', fill: '#059669' },
    matches: '#C9A84C',
    dau: '#10B981',
  },
  dark: {
    grid: '#48484A',
    text: '#D1D1D6',
    tooltipBg: '#2C2C2E',
    registrations: { stroke: '#6EE7B7', fill: '#10B981' },
    matches: '#F0D84E',
    dau: '#34D399',
  },
} as const;

/** Get the chart color set for the current theme. */
export function getChartColors(isDark: boolean) {
  return isDark ? CHART_COLORS.dark : CHART_COLORS.light;
}

// ── Event constraints ─────────────────────────────────────────────────────────

export const EVENT = {
  DURATION_MIN: 15,
  DURATION_MAX: 180,
} as const;
