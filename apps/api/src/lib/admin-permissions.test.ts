import { TRPCError } from '@trpc/server';
import { describe, expect, it } from 'vitest';
import { AdminRole, hasMinRole, requireRole } from './admin-permissions.js';

describe('admin-permissions', () => {
  describe('hasMinRole', () => {
    it('returns true when user role exceeds minimum', () => {
      expect(hasMinRole(AdminRole.SuperAdmin, AdminRole.Admin)).toBe(true);
    });

    it('returns true when user role equals minimum', () => {
      expect(hasMinRole(AdminRole.Moderator, AdminRole.Moderator)).toBe(true);
    });

    it('returns false when user role is below minimum', () => {
      expect(hasMinRole(AdminRole.Viewer, AdminRole.Admin)).toBe(false);
    });

    it('treats unknown roles as level 0', () => {
      expect(hasMinRole('unknown_role', AdminRole.Viewer)).toBe(false);
    });

    it('super_admin has access to everything', () => {
      expect(hasMinRole(AdminRole.SuperAdmin, AdminRole.SuperAdmin)).toBe(true);
      expect(hasMinRole(AdminRole.SuperAdmin, AdminRole.Admin)).toBe(true);
      expect(hasMinRole(AdminRole.SuperAdmin, AdminRole.Moderator)).toBe(true);
      expect(hasMinRole(AdminRole.SuperAdmin, AdminRole.Viewer)).toBe(true);
    });

    it('viewer only has access to viewer level', () => {
      expect(hasMinRole(AdminRole.Viewer, AdminRole.Viewer)).toBe(true);
      expect(hasMinRole(AdminRole.Viewer, AdminRole.Moderator)).toBe(false);
      expect(hasMinRole(AdminRole.Viewer, AdminRole.Admin)).toBe(false);
      expect(hasMinRole(AdminRole.Viewer, AdminRole.SuperAdmin)).toBe(false);
    });
  });

  describe('requireRole', () => {
    it('does not throw when role meets minimum', () => {
      expect(() => requireRole(AdminRole.Admin, AdminRole.Moderator)).not.toThrow();
    });

    it('does not throw when role equals minimum', () => {
      expect(() => requireRole(AdminRole.Admin, AdminRole.Admin)).not.toThrow();
    });

    it('throws TRPCError FORBIDDEN when role is below minimum', () => {
      expect(() => requireRole(AdminRole.Viewer, AdminRole.Admin)).toThrowError(
        expect.objectContaining({
          code: 'FORBIDDEN',
        }),
      );
    });

    it('throws with descriptive message including required role', () => {
      try {
        requireRole(AdminRole.Viewer, AdminRole.Admin);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(TRPCError);
        expect((err as TRPCError).message).toContain('admin');
      }
    });
  });
});
