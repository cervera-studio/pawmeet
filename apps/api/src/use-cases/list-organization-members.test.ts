import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildOrganizationMember, buildOrganizationRepo } from '../test-utils/builders.js';
import { createListOrganizationMembers } from './list-organization-members.js';

describe('listOrganizationMembers', () => {
  it('returns all members of an organization', async () => {
    const members = [
      buildOrganizationMember({ id: 'member-1', userId: 'user-1', role: 'owner' }),
      buildOrganizationMember({ id: 'member-2', userId: 'user-2', role: 'admin' }),
      buildOrganizationMember({ id: 'member-3', userId: 'user-3', role: 'member' }),
    ];
    const organizationRepo = buildOrganizationRepo({
      listMembers: vi.fn().mockResolvedValue(members),
    });

    const listOrganizationMembers = createListOrganizationMembers({ organizationRepo });
    const result = await listOrganizationMembers('org-1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data).toHaveLength(3);
      expect(result.data[0].role).toBe('owner');
      expect(result.data[1].role).toBe('admin');
      expect(result.data[2].role).toBe('member');
    }
    expect(organizationRepo.listMembers).toHaveBeenCalledWith('org-1');
  });

  it('returns empty list when organization has no members', async () => {
    const organizationRepo = buildOrganizationRepo({
      listMembers: vi.fn().mockResolvedValue([]),
    });

    const listOrganizationMembers = createListOrganizationMembers({ organizationRepo });
    const result = await listOrganizationMembers('org-1');

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data).toHaveLength(0);
    }
  });
});
