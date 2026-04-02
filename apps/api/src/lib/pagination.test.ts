import { describe, expect, it } from 'vitest';
import { paginate } from './pagination.js';

describe('pagination', () => {
  describe('paginate', () => {
    it('returns correct pagination metadata', () => {
      const result = paginate({ data: ['a', 'b', 'c'], total: 10 }, { page: 1, pageSize: 3 });

      expect(result).toEqual({
        data: ['a', 'b', 'c'],
        total: 10,
        page: 1,
        pageSize: 3,
        totalPages: 4,
      });
    });

    it('computes totalPages with ceiling division', () => {
      const result = paginate({ data: [], total: 7 }, { page: 1, pageSize: 3 });
      expect(result.totalPages).toBe(3);
    });

    it('returns 1 totalPage when total equals pageSize', () => {
      const result = paginate({ data: [1, 2, 3], total: 3 }, { page: 1, pageSize: 3 });
      expect(result.totalPages).toBe(1);
    });

    it('returns 0 totalPages when total is 0', () => {
      const result = paginate({ data: [], total: 0 }, { page: 1, pageSize: 10 });
      expect(result.totalPages).toBe(0);
    });

    it('preserves page and pageSize from input', () => {
      const result = paginate({ data: [], total: 100 }, { page: 5, pageSize: 20 });
      expect(result.page).toBe(5);
      expect(result.pageSize).toBe(20);
    });

    it('handles single-item result', () => {
      const result = paginate({ data: [{ id: '1' }], total: 1 }, { page: 1, pageSize: 10 });
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });
});
