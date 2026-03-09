const SITE_NAME = 'DogWalk';

const DEFAULT_DESCRIPTION =
  'DogWalk - Trova il compagno di passeggiata perfetto per il tuo cane. Connetti con altri proprietari di cani nella tua zona.';

const DEFAULT_OG_IMAGE = '/og-image.png';

/** Format a page title with the site name suffix */
export function formatPageTitle(title: string): string {
  return `${title} | ${SITE_NAME}`;
}

/** Get the copyright year for the footer */
export function getCopyrightYear(now: Date = new Date()): number {
  return now.getFullYear();
}

/** Build canonical URL from a pathname and site origin */
export function buildCanonicalUrl(pathname: string, siteOrigin: string): string {
  return new URL(pathname, siteOrigin).href;
}

/** Resolve page meta with defaults */
export function resolvePageMeta(options: {
  title: string;
  description?: string;
  ogImage?: string;
}): { title: string; description: string; ogImage: string } {
  return {
    title: formatPageTitle(options.title),
    description: options.description ?? DEFAULT_DESCRIPTION,
    ogImage: options.ogImage ?? DEFAULT_OG_IMAGE,
  };
}

export { SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE };
