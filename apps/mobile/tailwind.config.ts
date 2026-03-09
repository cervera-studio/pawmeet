import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B35',
          50: '#FFF3ED',
          100: '#FFE4D4',
          200: '#FFC5A8',
          300: '#FF9E71',
          400: '#FF6B35',
          500: '#FE4D0E',
          600: '#EF3504',
          700: '#C62505',
          800: '#9D200D',
          900: '#7E1D0E',
        },
        secondary: {
          DEFAULT: '#2D6A4F',
          50: '#EDFAF3',
          100: '#D5F3E2',
          200: '#AEE6C9',
          300: '#79D2AA',
          400: '#43B886',
          500: '#2D6A4F',
          600: '#1B7A4A',
          700: '#15613C',
          800: '#134D32',
          900: '#11402A',
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
} satisfies Config;
