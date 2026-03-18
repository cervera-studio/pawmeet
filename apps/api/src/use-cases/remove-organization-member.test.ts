import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { createOrganizationAuthorizer } from '../domain/organization-authorizer.js';
import { buildOrganizationMember, buildOrganizationRepo } from '../test-utils/builders.js';
import { createRemoveOrganizationMember } from './remove-organization-member.js';

describe('removeOrganizationMember', () => {
  function setup(
    overrides: { actorMember?: ReturnType<typeof buildOrganizationMember> | null } = {},
  ) {
    const actorMember =
      overrides.actorMember === undefined
        ? buildOrganizationMember({ role: 'owner', userId: 'actor-1' })
        : overrides.actorMember;

    const organizationRepo = buildOrganizationRepo({
      findMember: vi.fn().mockImplementation((_orgId: string, userId: string) => {
        if (userId === 'actor-1') return Promise.resolve(actorMember);
        return Promise.resolve(null);
      }),
    });

    const organizationAuthorizer = createOrganizationAuthorizer();
    const removeMember = createRemoveOrganizationMember({
      organizationRepo,
      organizationAuthorizer,
    });
    return { removeMember, organizationRepo };
  }

  it('removes a member when actor is owner', async () => {
    const { removeMember, organizationRepo } = setup();

    const result = await removeMember('actor-1', {
      organizationId: 'org-1',
      userId: 'user-2',
    });

    expect(isSuccess(result)).toBe(true);
    expect(organizationRepo.removeMember).toHaveBeenCalledWith('org-1', 'user-2');
  });

  it('removes a member when actor is admin', async () => {
    const { removeMember, organizationRepo } = setup({
      actorMember: buildOrganizationMember({ role: 'admin', userId: 'actor-1' }),
    });

    const result = await removeMember('actor-1', {
      organizationId: 'org-1',
      userId: 'user-2',
    });

    expect(isSuccess(result)).toBe(true);
    expect(organizationRepo.removeMember).toHaveBeenCalledWith('org-1', 'user-2');
  });

  it('fails when actor is a regular member', async () => {
    const { removeMember } = setup({
      actorMember: buildOrganizationMember({ role: 'member', userId: 'actor-1' }),
    });

    const result = await removeMember('actor-1', {
      organizationId: 'org-1',
      userId: 'user-2',
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORG_NOT_AUTHORIZED');
  });

  it('fails when actor is not a member at all', async () => {
    const { removeMember } = setup({ actorMember: null });

    const result = await removeMember('actor-1', {
      organizationId: 'org-1',
      userId: 'user-2',
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORG_NOT_AUTHORIZED');
  });
});
