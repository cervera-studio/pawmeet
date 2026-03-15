// ── Pagination ────────────────────────────────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
} as const;

// ── Timing ────────────────────────────────────────────────────────────────────

export const TIMING = {
  DEBOUNCE_DELAY_MS: 300,
} as const;

// ── Chart colors ──────────────────────────────────────────────────────────────

export const CHART_COLORS = {
  grid: '#e5e5e5',
  registrations: { stroke: '#065F46', fill: '#059669' },
  matches: '#C9A84C',
  dau: '#10B981',
} as const;

// ── Event constraints ─────────────────────────────────────────────────────────

export const EVENT = {
  DURATION_MIN: 15,
  DURATION_MAX: 180,
} as const;
