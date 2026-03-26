import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
export default defineConfig({
  site: 'https://pawmeet.io',
  integrations: [
    react(),
    sitemap({
      i18n: {
        defaultLocale: 'it',
        locales: {
          it: 'it-IT',
          en: 'en-US',
          es: 'es-ES',
          ro: 'ro-RO',
        },
      },
      // Exclude legal/utility pages from sitemap — low SEO value
      filter: (page) =>
        !page.includes('/cookie') &&
        !page.includes('/terms') &&
        !page.includes('/privacy'),
    }),
  ],
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'it',
    locales: ['it', 'en', 'es', 'ro'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
