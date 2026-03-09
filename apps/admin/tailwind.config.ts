import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B35',
          50: '#FFF3ED',
          100: '#FFE2D1',
          200: '#FFC4A3',
          300: '#FFA575',
          400: '#FF8753',
          500: '#FF6B35',
          600: '#E55A28',
          700: '#CC4A1C',
          800: '#993815',
          900: '#66250E',
        },
        secondary: {
          DEFAULT: '#2D6A4F',
          50: '#E8F5EE',
          100: '#D1EBDD',
          200: '#A3D7BB',
          300: '#75C399',
          400: '#47AF77',
          500: '#2D6A4F',
          600: '#245640',
          700: '#1B4130',
          800: '#122B20',
          900: '#091610',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
