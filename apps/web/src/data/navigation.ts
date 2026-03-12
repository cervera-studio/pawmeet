import type { Locale } from '../i18n/locales';
import { t } from '../i18n';

export interface NavLink {
  href: string;
  label: string;
}

/** Primary navigation links shown in the header */
export function getNavLinks(locale: Locale): NavLink[] {
  const strings = t(locale);
  const prefix = locale === 'it' ? '' : '/en';
  return [
    { href: prefix || '/', label: strings.nav.home },
    { href: locale === 'it' ? '/chi-siamo' : '/en/about', label: strings.nav.about },
    { href: `${prefix}/blog`, label: strings.nav.blog },
    { href: locale === 'it' ? '/contatti' : '/en/contact', label: strings.nav.contact },
  ];
}

/** Site links shown in the footer */
export function getSiteLinks(locale: Locale): NavLink[] {
  const strings = t(locale);
  const prefix = locale === 'it' ? '' : '/en';
  return [
    { href: locale === 'it' ? '/chi-siamo' : '/en/about', label: strings.nav.about },
    { href: `${prefix}/blog`, label: strings.nav.blog },
    { href: locale === 'it' ? '/contatti' : '/en/contact', label: strings.nav.contact },
    { href: `${prefix}/waitlist`, label: strings.nav.waitlist },
  ];
}

/** Legal page links shown in the footer */
export function getLegalLinks(locale: Locale): NavLink[] {
  const strings = t(locale);
  const prefix = locale === 'it' ? '' : '/en';
  return [
    { href: `${prefix}/privacy`, label: strings.meta.privacyTitle },
    { href: `${prefix}/terms`, label: strings.footer.termsLabel },
    { href: `${prefix}/cookie`, label: strings.meta.cookieTitle },
  ];
}
