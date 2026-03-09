import type { NavLink } from './navigation';
import { legalLinks, navLinks, siteLinks } from './navigation';

describe('navLinks', () => {
  it('contains the expected number of links', () => {
    expect(navLinks).toHaveLength(4);
  });

  it('starts with the Home link pointing to /', () => {
    expect(navLinks[0]).toEqual({ href: '/', label: 'Home' });
  });

  it('every entry has a non-empty href starting with /', () => {
    for (const link of navLinks) {
      expect(link.href).toMatch(/^\//);
    }
  });

  it('every entry has a non-empty label', () => {
    for (const link of navLinks) {
      expect(link.label.length).toBeGreaterThan(0);
    }
  });

  it('has no duplicate hrefs', () => {
    const hrefs = navLinks.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe('siteLinks', () => {
  it('contains the expected number of links', () => {
    expect(siteLinks).toHaveLength(4);
  });

  it('includes the waitlist link', () => {
    const waitlist = siteLinks.find((l) => l.href === '/waitlist');
    expect(waitlist).toBeDefined();
    expect(waitlist?.label).toBe('Waitlist');
  });

  it('does not include the Home link (footer does not need it)', () => {
    const home = siteLinks.find((l) => l.href === '/');
    expect(home).toBeUndefined();
  });

  it('every entry has a non-empty href starting with /', () => {
    for (const link of siteLinks) {
      expect(link.href).toMatch(/^\//);
    }
  });

  it('has no duplicate hrefs', () => {
    const hrefs = siteLinks.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe('legalLinks', () => {
  it('contains exactly 3 legal pages', () => {
    expect(legalLinks).toHaveLength(3);
  });

  it('includes privacy, terms, and cookie pages', () => {
    const hrefs = legalLinks.map((l) => l.href);
    expect(hrefs).toContain('/privacy');
    expect(hrefs).toContain('/terms');
    expect(hrefs).toContain('/cookie');
  });

  it('every entry has a non-empty href starting with /', () => {
    for (const link of legalLinks) {
      expect(link.href).toMatch(/^\//);
    }
  });

  it('has no duplicate hrefs', () => {
    const hrefs = legalLinks.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe('cross-list consistency', () => {
  it('no navLink href overlaps with legalLinks', () => {
    const navHrefs = new Set(navLinks.map((l) => l.href));
    for (const link of legalLinks) {
      expect(navHrefs.has(link.href)).toBe(false);
    }
  });

  it('all link objects satisfy the NavLink interface shape', () => {
    const allLinks: readonly NavLink[] = [...navLinks, ...siteLinks, ...legalLinks];
    for (const link of allLinks) {
      expect(typeof link.href).toBe('string');
      expect(typeof link.label).toBe('string');
      expect(Object.keys(link)).toHaveLength(2);
    }
  });
});
