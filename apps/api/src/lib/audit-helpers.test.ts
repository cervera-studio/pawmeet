import { describe, expect, it } from 'vitest';
import { toAuditChanges } from './audit-helpers.js';

describe('audit-helpers', () => {
  describe('toAuditChanges', () => {
    it('converts a typed object to Record<string, unknown>', () => {
      const input = { name: 'Rex', age: 3, active: true };
      const result = toAuditChanges(input);

      expect(result).toEqual({ name: 'Rex', age: 3, active: true });
    });

    it('returns an empty record for an empty object', () => {
      expect(toAuditChanges({})).toEqual({});
    });

    it('preserves null and undefined values', () => {
      const input = { a: null, b: undefined };
      const result = toAuditChanges(input);

      expect(result).toEqual({ a: null, b: undefined });
    });

    it('preserves nested objects as-is', () => {
      const input = { meta: { key: 'value' } };
      const result = toAuditChanges(input);

      expect(result.meta).toEqual({ key: 'value' });
    });

    it('result satisfies Record<string, unknown>', () => {
      const result: Record<string, unknown> = toAuditChanges({ x: 1 });
      expect(result.x).toBe(1);
    });
  });
});
