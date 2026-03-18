import type { Config } from 'tailwindcss';

const nativewindPreset = require('nativewind/preset');

export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [nativewindPreset],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#065F46',
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
        secondary: {
          DEFAULT: '#C9A84C',
          50: '#FDF8EF',
          100: '#FAF0D7',
          200: '#F5DFB0',
          300: '#EDCA7E',
          400: '#E0B04E',
          500: '#C9A84C',
          600: '#A6872E',
          700: '#836A24',
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
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
} satisfies Config;
