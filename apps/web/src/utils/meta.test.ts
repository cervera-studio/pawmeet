import {
  buildCanonicalUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  formatPageTitle,
  getCopyrightYear,
  resolvePageMeta,
  SITE_NAME,
} from './meta';

describe('formatPageTitle', () => {
  it('appends the site name with a pipe separator', () => {
    expect(formatPageTitle('Home')).toBe('Home | DogWalk');
  });

  it('works with longer page titles', () => {
    expect(formatPageTitle('Passeggia insieme al tuo cane')).toBe(
      'Passeggia insieme al tuo cane | DogWalk',
    );
  });

  it('handles empty string input', () => {
    expect(formatPageTitle('')).toBe(' | DogWalk');
  });
});

describe('getCopyrightYear', () => {
  it('returns the year from the provided date', () => {
    expect(getCopyrightYear(new Date('2026-03-09'))).toBe(2026);
  });

  it('returns 2024 for a 2024 date', () => {
    expect(getCopyrightYear(new Date('2024-01-01'))).toBe(2024);
  });

  it('defaults to current year when no argument is passed', () => {
    const result = getCopyrightYear();
    expect(result).toBe(new Date().getFullYear());
  });
});

describe('buildCanonicalUrl', () => {
  it('builds a full URL from pathname and origin', () => {
    expect(buildCanonicalUrl('/chi-siamo', 'https://dogwalk.app')).toBe(
      'https://dogwalk.app/chi-siamo',
    );
  });

  it('handles root pathname', () => {
    expect(buildCanonicalUrl('/', 'https://dogwalk.app')).toBe('https://dogwalk.app/');
  });

  it('handles trailing slash in origin', () => {
    expect(buildCanonicalUrl('/blog', 'https://dogwalk.app/')).toBe('https://dogwalk.app/blog');
  });

  it('handles nested pathnames', () => {
    expect(buildCanonicalUrl('/blog/first-post', 'https://dogwalk.app')).toBe(
      'https://dogwalk.app/blog/first-post',
    );
  });
});

describe('resolvePageMeta', () => {
  it('returns formatted title with site name', () => {
    const meta = resolvePageMeta({ title: 'Home' });
    expect(meta.title).toBe('Home | DogWalk');
  });

  it('uses default description when none is provided', () => {
    const meta = resolvePageMeta({ title: 'Home' });
    expect(meta.description).toBe(DEFAULT_DESCRIPTION);
  });

  it('uses default og image when none is provided', () => {
    const meta = resolvePageMeta({ title: 'Home' });
    expect(meta.ogImage).toBe(DEFAULT_OG_IMAGE);
  });

  it('uses custom description when provided', () => {
    const meta = resolvePageMeta({ title: 'Home', description: 'Custom description' });
    expect(meta.description).toBe('Custom description');
  });

  it('uses custom og image when provided', () => {
    const meta = resolvePageMeta({ title: 'Home', ogImage: '/custom-og.png' });
    expect(meta.ogImage).toBe('/custom-og.png');
  });

  it('returns all three expected keys', () => {
    const meta = resolvePageMeta({ title: 'Test' });
    expect(Object.keys(meta).sort()).toEqual(['description', 'ogImage', 'title']);
  });
});

describe('constants', () => {
  it('SITE_NAME is DogWalk', () => {
    expect(SITE_NAME).toBe('DogWalk');
  });

  it('DEFAULT_DESCRIPTION is a non-empty string', () => {
    expect(DEFAULT_DESCRIPTION.length).toBeGreaterThan(0);
  });

  it('DEFAULT_DESCRIPTION mentions DogWalk', () => {
    expect(DEFAULT_DESCRIPTION).toContain('DogWalk');
  });

  it('DEFAULT_OG_IMAGE is a path to a png', () => {
    expect(DEFAULT_OG_IMAGE).toMatch(/\.png$/);
  });
});
