// PawMeet Design Tokens — Colors
// Palette A: Deep Forest & Champagne
// Mood: "Vita nella natura di lusso"

export const primitiveColors = {
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },
  gold: {
    50: '#FDF8EF',
    100: '#FAF0D7',
    200: '#F5DFB0',
    300: '#EDCA7E',
    400: '#E0B04E',
    500: '#C9A84C',
    600: '#A6872E',
    700: '#8B6914',
    800: '#6B551E',
    900: '#574518',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F2F2F7',
    200: '#E5E5EA',
    300: '#C7C7CC',
    500: '#8E8E93',
    700: '#4A4A5A',
    900: '#1A1A2E',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const lightColors = {
  primary: primitiveColors.emerald[800], // #065F46
  primaryDark: primitiveColors.emerald[900], // #064E3B
  primaryLight: primitiveColors.emerald[600], // #059669
  primary50: primitiveColors.emerald[50], // #ECFDF5

  accent: primitiveColors.emerald[500], // #10B981 — only on dark bg or as background

  secondary: primitiveColors.gold[500], // #C9A84C — decorative/bg only on light
  secondaryText: primitiveColors.gold[700], // #8B6914 — text gold on light (AA 4.86:1)
  secondaryDark: primitiveColors.gold[600], // #A6872E — borders, icons
  secondary50: primitiveColors.gold[50], // #FDF8EF

  textPrimary: primitiveColors.neutral[900], // #1A1A2E
  textSecondary: primitiveColors.neutral[700], // #4A4A5A
  textPlaceholder: primitiveColors.neutral[500], // #8E8E93
  textInverse: primitiveColors.white, // #FFFFFF

  surfacePrimary: primitiveColors.white, // #FFFFFF
  surfaceSecondary: primitiveColors.neutral[50], // #FAFAFA
  surfaceCard: primitiveColors.neutral[100], // #F2F2F7

  border: primitiveColors.neutral[300], // #C7C7CC
  borderLight: primitiveColors.neutral[200], // #E5E5EA
  divider: primitiveColors.neutral[200], // #E5E5EA

  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  warningText: '#B45309', // accessible on white (AA)
  info: '#007AFF',
} as const;

export const darkColors = {
  primary: primitiveColors.emerald[800], // #065F46 — stays the same
  primaryDark: primitiveColors.emerald[900], // #064E3B
  primaryLight: primitiveColors.emerald[600], // #059669
  primary50: '#0D2F23', // dark tinted green

  accent: primitiveColors.emerald[500], // #10B981 — AA 6.71:1 on dark

  secondary: primitiveColors.gold[500], // #C9A84C — AAA 7.45:1 on dark
  secondaryText: primitiveColors.gold[500], // same as secondary in dark mode
  secondaryDark: primitiveColors.gold[600], // #A6872E
  secondary50: '#2A2418', // dark tinted gold

  textPrimary: '#F5F5F7',
  textSecondary: '#D1D1D6',
  textPlaceholder: primitiveColors.neutral[500], // #8E8E93
  textInverse: primitiveColors.neutral[900], // #1A1A2E

  surfacePrimary: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',
  surfaceCard: '#38383A',

  border: '#48484A',
  borderLight: '#38383A',
  divider: '#38383A',

  success: '#30D158',
  error: '#FF453A',
  warning: '#FFD60A',
  warningText: '#FFD60A',
  info: '#0A84FF',
} as const;

export type ColorTokens = typeof lightColors;
