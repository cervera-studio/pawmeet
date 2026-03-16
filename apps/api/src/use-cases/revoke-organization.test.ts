import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildOrganization, buildOrganizationRepo } from '../test-utils/builders.js';
import { createRevokeOrganization } from './revoke-organization.js';

describe('revokeOrganization', () => {
  it('revokes an existing organization', async () => {
    const revokedOrg = buildOrganization({ id: 'org-1', isVerified: false });
    const organizationRepo = buildOrganizationRepo({
      findById: vi.fn().mockResolvedValue(buildOrganization({ id: 'org-1' })),
      revoke: vi.fn().mockResolvedValue(revokedOrg),
    });

    const revokeOrganization = createRevokeOrganization({ organizationRepo });
    const result = await revokeOrganization('org-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.isVerified).toBe(false);
    expect(organizationRepo.revoke).toHaveBeenCalledWith('org-1');
  });

  it('fails when organization does not exist', async () => {
    const organizationRepo = buildOrganizationRepo({
      findById: vi.fn().mockResolvedValue(null),
    });

    const revokeOrganization = createRevokeOrganization({ organizationRepo });
    const result = await revokeOrganization('nonexistent');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORG_NOT_FOUND');
    expect(organizationRepo.revoke).not.toHaveBeenCalled();
  });
});
