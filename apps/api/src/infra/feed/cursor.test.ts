import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from './cursor.js';

describe('feed/cursor', () => {
  describe('encodeCursor / decodeCursor roundtrip', () => {
    it('encodes and decodes back to the original values', () => {
      const createdAt = new Date('2025-06-15T10:30:00.000Z');
      const id = 'post-abc-123';

      const encoded = encodeCursor(createdAt, id);
      const decoded = decodeCursor(encoded);

      expect(decoded).toEqual({ createdAt, id });
    });

    it('produces a base64 string', () => {
      const encoded = encodeCursor(new Date('2025-01-01T00:00:00.000Z'), 'x');
      expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('preserves milliseconds in dates', () => {
      const createdAt = new Date('2025-12-31T23:59:59.999Z');
      const id = 'id-with-ms';

      const decoded = decodeCursor(encodeCursor(createdAt, id));
      expect(decoded?.createdAt.getTime()).toBe(createdAt.getTime());
    });
  });

  describe('decodeCursor edge cases', () => {
    it('returns null for empty string', () => {
      expect(decodeCursor('')).toBeNull();
    });

    it('returns null for non-base64 garbage', () => {
      expect(decodeCursor('%%%not-base64!!!')).toBeNull();
    });

    it('returns null when pipe separator is missing', () => {
      const noPipe = Buffer.from('no-pipe-here').toString('base64');
      expect(decodeCursor(noPipe)).toBeNull();
    });

    it('returns null for invalid ISO date', () => {
      const bad = Buffer.from('not-a-date|some-id').toString('base64');
      expect(decodeCursor(bad)).toBeNull();
    });

    it('returns null when id part is empty', () => {
      const noId = Buffer.from('2025-01-01T00:00:00.000Z|').toString('base64');
      expect(decodeCursor(noId)).toBeNull();
    });
  });
});
