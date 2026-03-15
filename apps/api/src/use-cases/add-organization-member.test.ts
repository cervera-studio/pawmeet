import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { createOrganizationAuthorizer } from '../domain/organization-authorizer.js';
import {
  buildOrganization,
  buildOrganizationMember,
  buildOrganizationRepo,
} from '../test-utils/builders.js';
import { createAddOrganizationMember } from './add-organization-member.js';

describe('addOrganizationMember', () => {
  function setup(
    overrides: {
      actorMember?: ReturnType<typeof buildOrganizationMember> | null;
      existingMember?: ReturnType<typeof buildOrganizationMember> | null;
    } = {},
  ) {
    const actorMember =
      overrides.actorMember !== undefined
        ? overrides.actorMember
        : buildOrganizationMember({ role: 'owner', userId: 'actor-1' });

    const organizationRepo = buildOrganizationRepo({
      findById: vi.fn().mockResolvedValue(buildOrganization()),
      findMember: vi.fn().mockImplementation((_orgId: string, userId: string) => {
        if (userId === 'actor-1') return Promise.resolve(actorMember);
        return Promise.resolve(overrides.existingMember ?? null);
      }),
    });

    const organizationAuthorizer = createOrganizationAuthorizer();
    const addMember = createAddOrganizationMember({ organizationRepo, organizationAuthorizer });
    return { addMember, organizationRepo };
  }

  it('adds a new member', async () => {
    const { addMember, organizationRepo } = setup();

    const result = await addMember('actor-1', {
      organizationId: 'org-1',
      userId: 'user-2',
      role: 'member',
    });

    expect(isSuccess(result)).toBe(true);
    expect(organizationRepo.addMember).toHaveBeenCalledWith('org-1', 'user-2', 'member');
  });

  it('fails if actor is not owner/admin', async () => {
    const { addMember } = setup({
      actorMember: buildOrganizationMember({ role: 'member', userId: 'actor-1' }),
    });

    const result = await addMember('actor-1', {
      organizationId: 'org-1',
      userId: 'user-2',
      role: 'member',
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORG_NOT_AUTHORIZED');
  });

  it('fails if user is already a member', async () => {
    const { addMember } = setup({
      existingMember: buildOrganizationMember({ userId: 'user-2' }),
    });

    const result = await addMember('actor-1', {
      organizationId: 'org-1',
      userId: 'user-2',
      role: 'member',
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORG_MEMBER_EXISTS');
  });
});
