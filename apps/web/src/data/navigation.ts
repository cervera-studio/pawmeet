import { t } from '../i18n';
import type { Locale } from '../i18n/locales';
import { getAlternatePath } from '../i18n/routes';

export interface NavLink {
  href: string;
  label: string;
}

/** Primary navigation links shown in the header */
export function getNavLinks(locale: Locale): NavLink[] {
  const strings = t(locale);
  return [
    { href: getAlternatePath('/', locale), label: strings.nav.home },
    { href: getAlternatePath('/chi-siamo', locale), label: strings.nav.about },
    { href: getAlternatePath('/blog', locale), label: strings.nav.blog },
    { href: getAlternatePath('/contatti', locale), label: strings.nav.contact },
  ];
}

/** Site links shown in the footer */
export function getSiteLinks(locale: Locale): NavLink[] {
  const strings = t(locale);
  return [
    { href: getAlternatePath('/chi-siamo', locale), label: strings.nav.about },
    { href: getAlternatePath('/blog', locale), label: strings.nav.blog },
    { href: getAlternatePath('/contatti', locale), label: strings.nav.contact },
    { href: getAlternatePath('/waitlist', locale), label: strings.nav.waitlist },
  ];
}

/** Legal page links shown in the footer */
export function getLegalLinks(locale: Locale): NavLink[] {
  const strings = t(locale);
  return [
    { href: getAlternatePath('/privacy', locale), label: strings.meta.privacyTitle },
    { href: getAlternatePath('/terms', locale), label: strings.footer.termsLabel },
    { href: getAlternatePath('/cookie', locale), label: strings.meta.cookieTitle },
  ];
}
