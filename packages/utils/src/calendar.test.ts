import { describe, expect, it } from 'vitest';
import {
  addDays,
  dateKey,
  getMonthDays,
  getWeekDays,
  groupByDate,
  isSameDay,
  monthHeaderTitle,
  startOfWeek,
  weekHeaderTitle,
} from './calendar';

describe('calendar utilities', () => {
  describe('startOfWeek', () => {
    it('returns Monday for a Wednesday', () => {
      // 2026-03-18 is a Wednesday
      const wed = new Date(2026, 2, 18);
      const monday = startOfWeek(wed);
      expect(monday.getDay()).toBe(1); // Monday
      expect(monday.getDate()).toBe(16);
    });

    it('returns Monday for a Monday', () => {
      const mon = new Date(2026, 2, 16);
      const result = startOfWeek(mon);
      expect(result.getDate()).toBe(16);
    });

    it('returns Monday for a Sunday', () => {
      // 2026-03-22 is a Sunday
      const sun = new Date(2026, 2, 22);
      const monday = startOfWeek(sun);
      expect(monday.getDay()).toBe(1);
      expect(monday.getDate()).toBe(16);
    });
  });

  describe('addDays', () => {
    it('adds positive days', () => {
      const d = new Date(2026, 2, 15);
      const result = addDays(d, 5);
      expect(result.getDate()).toBe(20);
    });

    it('subtracts days with negative value', () => {
      const d = new Date(2026, 2, 15);
      const result = addDays(d, -3);
      expect(result.getDate()).toBe(12);
    });

    it('handles month boundary', () => {
      const d = new Date(2026, 2, 30);
      const result = addDays(d, 3);
      expect(result.getMonth()).toBe(3); // April
      expect(result.getDate()).toBe(2);
    });
  });

  describe('isSameDay', () => {
    it('returns true for same day', () => {
      const a = new Date(2026, 2, 15, 10, 0);
      const b = new Date(2026, 2, 15, 18, 30);
      expect(isSameDay(a, b)).toBe(true);
    });

    it('returns false for different days', () => {
      const a = new Date(2026, 2, 15);
      const b = new Date(2026, 2, 16);
      expect(isSameDay(a, b)).toBe(false);
    });
  });

  describe('getMonthDays', () => {
    it('returns 42 days (6 weeks)', () => {
      const days = getMonthDays(2026, 2); // March 2026
      expect(days).toHaveLength(42);
    });

    it('starts on a Monday', () => {
      const days = getMonthDays(2026, 2);
      expect(days[0]?.getDay()).toBe(1);
    });

    it('includes the first day of the month', () => {
      const days = getMonthDays(2026, 2);
      const first = days.find((d) => d.getMonth() === 2 && d.getDate() === 1);
      expect(first).toBeDefined();
    });

    it('includes the last day of the month', () => {
      const days = getMonthDays(2026, 2);
      const last = days.find((d) => d.getMonth() === 2 && d.getDate() === 31);
      expect(last).toBeDefined();
    });
  });

  describe('getWeekDays', () => {
    it('returns 7 days starting from the given date', () => {
      const monday = new Date(2026, 2, 16);
      const days = getWeekDays(monday);
      expect(days).toHaveLength(7);
      expect(days[0]?.getDate()).toBe(16);
      expect(days[6]?.getDate()).toBe(22);
    });
  });

  describe('dateKey', () => {
    it('generates consistent key for same day regardless of time', () => {
      const a = new Date(2026, 2, 15, 10, 0);
      const b = new Date(2026, 2, 15, 22, 30);
      expect(dateKey(a)).toBe(dateKey(b));
    });

    it('generates different keys for different days', () => {
      const a = new Date(2026, 2, 15);
      const b = new Date(2026, 2, 16);
      expect(dateKey(a)).not.toBe(dateKey(b));
    });
  });

  describe('groupByDate', () => {
    it('groups items by their scheduledAt date', () => {
      const items = [
        { id: '1', scheduledAt: new Date(2026, 2, 15, 10, 0) },
        { id: '2', scheduledAt: new Date(2026, 2, 15, 14, 0) },
        { id: '3', scheduledAt: new Date(2026, 2, 16, 10, 0) },
      ];
      const grouped = groupByDate(items);
      const key15 = dateKey(new Date(2026, 2, 15));
      const key16 = dateKey(new Date(2026, 2, 16));
      expect(grouped.get(key15)).toHaveLength(2);
      expect(grouped.get(key16)).toHaveLength(1);
    });

    it('handles string dates', () => {
      const items = [
        { id: '1', scheduledAt: '2026-03-15T10:00:00Z' },
        { id: '2', scheduledAt: '2026-03-15T18:00:00Z' },
      ];
      const grouped = groupByDate(items);
      expect(grouped.size).toBeGreaterThanOrEqual(1);
    });

    it('returns empty map for empty input', () => {
      const grouped = groupByDate([]);
      expect(grouped.size).toBe(0);
    });
  });

  describe('monthHeaderTitle', () => {
    it('returns Italian month name and year', () => {
      const d = new Date(2026, 2, 15); // March
      expect(monthHeaderTitle(d)).toBe('Marzo 2026');
    });
  });

  describe('weekHeaderTitle', () => {
    it('returns range within same month', () => {
      const d = new Date(2026, 2, 18); // Wed March 18
      const title = weekHeaderTitle(d);
      expect(title).toBe('16-22 Marzo 2026');
    });

    it('returns abbreviated months when spanning two months', () => {
      const d = new Date(2026, 2, 31); // March 31 (Tue)
      const title = weekHeaderTitle(d);
      expect(title).toContain('Mar');
      expect(title).toContain('Apr');
    });
  });

  // Multi-dog: the groupByDate function is dog-agnostic,
  // so multi-dog filtering happens at the view-model level.
  // This test ensures the utility works with any item shape.
  describe('multi-dog support', () => {
    it('groups walks regardless of dog metadata', () => {
      const walks = [
        { id: 'w1', scheduledAt: new Date(2026, 2, 20), dogId: 'dog-1' },
        { id: 'w2', scheduledAt: new Date(2026, 2, 20), dogId: 'dog-2' },
        { id: 'w3', scheduledAt: new Date(2026, 2, 21), dogId: 'dog-1' },
      ];
      const grouped = groupByDate(walks);
      const key20 = dateKey(new Date(2026, 2, 20));
      expect(grouped.get(key20)).toHaveLength(2);
    });
  });
});
