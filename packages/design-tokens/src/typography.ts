// PawMeet Design Tokens — Typography
// Font: Inter (400, 600, 700)

export const fontFamily = {
  sans: 'Inter',
  fallback: 'system-ui, -apple-system, sans-serif',
} as const;

export const fontWeights = {
  regular: '400',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Type scale on a 4px baseline grid.
 * All fontSize and lineHeight values are multiples of 4 (or 2 for ≤12px).
 */
export const typography = {
  displayLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: fontWeights.bold,
    letterSpacing: -0.3,
  },
  headingLarge: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.2,
  },
  headingMedium: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: fontWeights.semibold,
    letterSpacing: -0.1,
  },
  headingSmall: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.regular,
    letterSpacing: 0,
  },
  labelLarge: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.1,
  },
  labelSmall: {
    fontSize: 10,
    lineHeight: 16,
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.2,
  },
} as const;

export type TypographyToken = keyof typeof typography;
