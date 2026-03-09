export interface NavLink {
  href: string;
  label: string;
}

/** Primary navigation links shown in the header */
export const navLinks: readonly NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/chi-siamo', label: 'Chi siamo' },
  { href: '/blog', label: 'Blog' },
  { href: '/contatti', label: 'Contatti' },
];

/** Site links shown in the footer */
export const siteLinks: readonly NavLink[] = [
  { href: '/chi-siamo', label: 'Chi siamo' },
  { href: '/blog', label: 'Blog' },
  { href: '/contatti', label: 'Contatti' },
  { href: '/waitlist', label: 'Waitlist' },
];

/** Legal page links shown in the footer */
export const legalLinks: readonly NavLink[] = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Termini e Condizioni' },
  { href: '/cookie', label: 'Cookie Policy' },
];
