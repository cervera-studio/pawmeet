import { describe, expect, it } from 'vitest';
import { createOrganizationAuthorizer } from './organization-authorizer.js';

const authorizer = createOrganizationAuthorizer();

describe('OrganizationAuthorizer', () => {
  describe('canManageMembers', () => {
    it('allows owner', () => {
      expect(authorizer.canManageMembers('owner')).toBe(true);
    });

    it('allows admin', () => {
      expect(authorizer.canManageMembers('admin')).toBe(true);
    });

    it('denies member', () => {
      expect(authorizer.canManageMembers('member')).toBe(false);
    });
  });

  describe('canUpdateRole', () => {
    it('owner can update admin', () => {
      expect(authorizer.canUpdateRole('owner', 'admin')).toBe(true);
    });

    it('owner can update member', () => {
      expect(authorizer.canUpdateRole('owner', 'member')).toBe(true);
    });

    it('admin can update member', () => {
      expect(authorizer.canUpdateRole('admin', 'member')).toBe(true);
    });

    it('admin cannot update another admin (equal weight)', () => {
      expect(authorizer.canUpdateRole('admin', 'admin')).toBe(false);
    });

    it('admin cannot update owner', () => {
      expect(authorizer.canUpdateRole('admin', 'owner')).toBe(false);
    });

    it('member cannot update anyone', () => {
      expect(authorizer.canUpdateRole('member', 'member')).toBe(false);
      expect(authorizer.canUpdateRole('member', 'admin')).toBe(false);
      expect(authorizer.canUpdateRole('member', 'owner')).toBe(false);
    });
  });

  describe('canRevokeOrg', () => {
    it('allows owner', () => {
      expect(authorizer.canRevokeOrg('owner')).toBe(true);
    });

    it('denies admin', () => {
      expect(authorizer.canRevokeOrg('admin')).toBe(false);
    });

    it('denies member', () => {
      expect(authorizer.canRevokeOrg('member')).toBe(false);
    });
  });
});
