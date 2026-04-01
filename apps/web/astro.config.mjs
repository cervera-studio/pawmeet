import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://pawmeet.io';

/**
 * Maps canonical (Italian) paths to localized paths.
 * Must stay in sync with src/i18n/routes.ts.
 */
const routeMap = {
  '/': { it: '/', en: '/en/', es: '/es/', ro: '/ro/' },
  '/chi-siamo/': { it: '/chi-siamo/', en: '/en/about/', es: '/es/about/', ro: '/ro/about/' },
  '/contatti/': { it: '/contatti/', en: '/en/contact/', es: '/es/contact/', ro: '/ro/contact/' },
  '/waitlist/': { it: '/waitlist/', en: '/en/waitlist/', es: '/es/waitlist/', ro: '/ro/waitlist/' },
};

const hreflangMap = { it: 'it-IT', en: 'en-US', es: 'es-ES', ro: 'ro-RO' };

/** Reverse lookup: any URL path → its canonical key */
const reverseRoute = new Map();
for (const [canonical, locales] of Object.entries(routeMap)) {
  for (const path of Object.values(locales)) {
    reverseRoute.set(`${SITE}${path}`, canonical);
  }
}

export default defineConfig({
  site: SITE,
  integrations: [
    react(),
    sitemap({
      // Exclude legal/utility pages and empty blog from sitemap
      filter: (page) =>
        !page.includes('/cookie') &&
        !page.includes('/terms') &&
        !page.includes('/privacy') &&
        !page.includes('/blog'),
      serialize(item) {
        const canonical = reverseRoute.get(item.url);
        if (canonical) {
          const locales = routeMap[canonical];
          item.links = [
            ...Object.entries(locales).map(([lang, path]) => ({
              lang: hreflangMap[lang],
              url: `${SITE}${path}`,
            })),
            { lang: 'x-default', url: `${SITE}${locales.it}` },
          ];
        }
        return item;
      },
    }),
  ],
  trailingSlash: 'always',
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
