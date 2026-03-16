import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildOrganizationMember, buildOrganizationRepo } from '../test-utils/builders.js';
import { createListOrganizationMembers } from './list-organization-members.js';

describe('listOrganizationMembers', () => {
  it('returns members for the given organization', async () => {
    const members = [
      buildOrganizationMember({ userId: 'user-1', role: 'owner' }),
      buildOrganizationMember({ userId: 'user-2', role: 'member' }),
    ];
    const organizationRepo = buildOrganizationRepo({
      listMembers: vi.fn().mockResolvedValue(members),
    });

    const listMembers = createListOrganizationMembers({ organizationRepo });
    const result = await listMembers('org-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveLength(2);
    expect(organizationRepo.listMembers).toHaveBeenCalledWith('org-1');
  });

  it('returns empty array when no members exist', async () => {
    const organizationRepo = buildOrganizationRepo({
      listMembers: vi.fn().mockResolvedValue([]),
    });

    const listMembers = createListOrganizationMembers({ organizationRepo });
    const result = await listMembers('org-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveLength(0);
  });
});
