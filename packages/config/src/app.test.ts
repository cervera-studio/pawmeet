import * as app from './app';

describe('app constants', () => {
  describe('exports completeness', () => {
    const requiredKeys = [
      'MAX_DOGS_PER_USER',
      'MAX_PHOTOS_PER_DOG',
      'MIN_PHOTOS_PER_DOG',
      'DEFAULT_SEARCH_RADIUS_KM',
      'MAX_SEARCH_RADIUS_KM',
      'MIN_SEARCH_RADIUS_KM',
      'SWIPE_DAILY_LIMIT',
      'COMPATIBILITY_THRESHOLD',
      'MAX_BIO_LENGTH',
      'MAX_DISPLAY_NAME_LENGTH',
      'MIN_PASSWORD_LENGTH',
      'MIN_USER_AGE',
      'WALK_DURATION_MIN',
      'WALK_DURATION_MAX',
      'DOG_WEIGHT_MIN_KG',
      'DOG_WEIGHT_MAX_KG',
      'GROUP_EVENT_MIN_PARTICIPANTS',
      'GROUP_EVENT_MAX_PARTICIPANTS',
      'GROUP_EVENT_TITLE_MAX_LENGTH',
      'GROUP_EVENT_DESCRIPTION_MAX_LENGTH',
    ] as const;

    it.each(requiredKeys)('exports %s', (key) => {
      expect(app).toHaveProperty(key);
    });

    it('exports exactly the expected number of constants', () => {
      expect(Object.keys(app)).toHaveLength(requiredKeys.length);
    });
  });

  describe('all values are finite numbers', () => {
    it.each(Object.entries(app))('%s is a finite number', (_key, value) => {
      expect(typeof value).toBe('number');
      expect(Number.isFinite(value)).toBe(true);
    });
  });

  describe('dog limits', () => {
    it('MAX_DOGS_PER_USER is a positive integer', () => {
      expect(app.MAX_DOGS_PER_USER).toBeGreaterThan(0);
      expect(Number.isInteger(app.MAX_DOGS_PER_USER)).toBe(true);
    });

    it('MIN_PHOTOS_PER_DOG is at least 1', () => {
      expect(app.MIN_PHOTOS_PER_DOG).toBeGreaterThanOrEqual(1);
    });

    it('MAX_PHOTOS_PER_DOG is greater than MIN_PHOTOS_PER_DOG', () => {
      expect(app.MAX_PHOTOS_PER_DOG).toBeGreaterThan(app.MIN_PHOTOS_PER_DOG);
    });

    it('DOG_WEIGHT_MIN_KG is positive', () => {
      expect(app.DOG_WEIGHT_MIN_KG).toBeGreaterThan(0);
    });

    it('DOG_WEIGHT_MAX_KG is greater than DOG_WEIGHT_MIN_KG', () => {
      expect(app.DOG_WEIGHT_MAX_KG).toBeGreaterThan(app.DOG_WEIGHT_MIN_KG);
    });
  });

  describe('search radius', () => {
    it('MIN_SEARCH_RADIUS_KM is positive', () => {
      expect(app.MIN_SEARCH_RADIUS_KM).toBeGreaterThan(0);
    });

    it('DEFAULT_SEARCH_RADIUS_KM is within min/max bounds', () => {
      expect(app.DEFAULT_SEARCH_RADIUS_KM).toBeGreaterThanOrEqual(app.MIN_SEARCH_RADIUS_KM);
      expect(app.DEFAULT_SEARCH_RADIUS_KM).toBeLessThanOrEqual(app.MAX_SEARCH_RADIUS_KM);
    });

    it('MAX_SEARCH_RADIUS_KM is greater than MIN_SEARCH_RADIUS_KM', () => {
      expect(app.MAX_SEARCH_RADIUS_KM).toBeGreaterThan(app.MIN_SEARCH_RADIUS_KM);
    });
  });

  describe('swipe and compatibility', () => {
    it('SWIPE_DAILY_LIMIT is a positive integer', () => {
      expect(app.SWIPE_DAILY_LIMIT).toBeGreaterThan(0);
      expect(Number.isInteger(app.SWIPE_DAILY_LIMIT)).toBe(true);
    });

    it('COMPATIBILITY_THRESHOLD is between 0 and 1 (exclusive)', () => {
      expect(app.COMPATIBILITY_THRESHOLD).toBeGreaterThan(0);
      expect(app.COMPATIBILITY_THRESHOLD).toBeLessThan(1);
    });
  });

  describe('text field lengths', () => {
    it('MAX_BIO_LENGTH is a positive integer', () => {
      expect(app.MAX_BIO_LENGTH).toBeGreaterThan(0);
      expect(Number.isInteger(app.MAX_BIO_LENGTH)).toBe(true);
    });

    it('MAX_DISPLAY_NAME_LENGTH is a positive integer', () => {
      expect(app.MAX_DISPLAY_NAME_LENGTH).toBeGreaterThan(0);
      expect(Number.isInteger(app.MAX_DISPLAY_NAME_LENGTH)).toBe(true);
    });

    it('MAX_BIO_LENGTH is greater than MAX_DISPLAY_NAME_LENGTH', () => {
      expect(app.MAX_BIO_LENGTH).toBeGreaterThan(app.MAX_DISPLAY_NAME_LENGTH);
    });
  });

  describe('password', () => {
    it('MIN_PASSWORD_LENGTH is at least 8', () => {
      expect(app.MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(8);
    });
  });

  describe('walk duration', () => {
    it('WALK_DURATION_MIN is a positive integer', () => {
      expect(app.WALK_DURATION_MIN).toBeGreaterThan(0);
      expect(Number.isInteger(app.WALK_DURATION_MIN)).toBe(true);
    });

    it('WALK_DURATION_MAX is greater than WALK_DURATION_MIN', () => {
      expect(app.WALK_DURATION_MAX).toBeGreaterThan(app.WALK_DURATION_MIN);
    });

    it('WALK_DURATION_MAX is reasonable (no more than 24 hours in minutes)', () => {
      expect(app.WALK_DURATION_MAX).toBeLessThanOrEqual(1440);
    });
  });
});
