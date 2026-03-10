import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
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
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
} satisfies Config;
