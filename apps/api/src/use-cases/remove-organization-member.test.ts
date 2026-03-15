import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { createOrganizationAuthorizer } from '../domain/organization-authorizer.js';
import { buildOrganizationMember, buildOrganizationRepo } from '../test-utils/builders.js';
import { createRemoveOrganizationMember } from './remove-organization-member.js';

describe('removeOrganizationMember', () => {
  const organizationAuthorizer = createOrganizationAuthorizer();

  it('removes a member when actor is an owner', async () => {
    const organizationRepo = buildOrganizationRepo({
      findMember: vi.fn().mockResolvedValue(buildOrganizationMember({ role: 'owner' })),
      removeMember: vi.fn().mockResolvedValue(undefined),
    });

    const removeOrganizationMember = createRemoveOrganizationMember({
      organizationRepo,
      organizationAuthorizer,
    });
    const result = await removeOrganizationMember('user-1', {
      organizationId: 'org-1',
      userId: 'user-2',
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data.success).toBe(true);
    }
    expect(organizationRepo.removeMember).toHaveBeenCalledWith('org-1', 'user-2');
  });

  it('removes a member when actor is an admin', async () => {
    const organizationRepo = buildOrganizationRepo({
      findMember: vi.fn().mockResolvedValue(buildOrganizationMember({ role: 'admin' })),
      removeMember: vi.fn().mockResolvedValue(undefined),
    });

    const removeOrganizationMember = createRemoveOrganizationMember({
      organizationRepo,
      organizationAuthorizer,
    });
    const result = await removeOrganizationMember('user-1', {
      organizationId: 'org-1',
      userId: 'user-2',
    });

    expect(isSuccess(result)).toBe(true);
    expect(organizationRepo.removeMember).toHaveBeenCalledWith('org-1', 'user-2');
  });

  it('fails when actor is a regular member', async () => {
    const organizationRepo = buildOrganizationRepo({
      findMember: vi.fn().mockResolvedValue(buildOrganizationMember({ role: 'member' })),
    });

    const removeOrganizationMember = createRemoveOrganizationMember({
      organizationRepo,
      organizationAuthorizer,
    });
    const result = await removeOrganizationMember('user-1', {
      organizationId: 'org-1',
      userId: 'user-2',
    });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('ORG_NOT_AUTHORIZED');
      expect(result.error.status).toBe(403);
    }
    expect(organizationRepo.removeMember).not.toHaveBeenCalled();
  });

  it('fails when actor is not a member of the organization', async () => {
    const organizationRepo = buildOrganizationRepo({
      findMember: vi.fn().mockResolvedValue(null),
    });

    const removeOrganizationMember = createRemoveOrganizationMember({
      organizationRepo,
      organizationAuthorizer,
    });
    const result = await removeOrganizationMember('outsider', {
      organizationId: 'org-1',
      userId: 'user-2',
    });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('ORG_NOT_AUTHORIZED');
      expect(result.error.status).toBe(403);
    }
    expect(organizationRepo.removeMember).not.toHaveBeenCalled();
  });
});
