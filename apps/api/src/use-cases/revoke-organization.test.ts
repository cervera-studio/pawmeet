import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildOrganization, buildOrganizationRepo } from '../test-utils/builders.js';
import { createRevokeOrganization } from './revoke-organization.js';

describe('revokeOrganization', () => {
  it('revokes an existing organization', async () => {
    const org = buildOrganization({ isVerified: true });
    const revokedOrg = buildOrganization({ isVerified: false });
    const organizationRepo = buildOrganizationRepo({
      findById: vi.fn().mockResolvedValue(org),
      revoke: vi.fn().mockResolvedValue(revokedOrg),
    });

    const revokeOrganization = createRevokeOrganization({ organizationRepo });
    const result = await revokeOrganization(org.id);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data.isVerified).toBe(false);
    }
    expect(organizationRepo.revoke).toHaveBeenCalledWith(org.id);
  });

  it('fails when organization does not exist', async () => {
    const organizationRepo = buildOrganizationRepo({
      findById: vi.fn().mockResolvedValue(null),
    });

    const revokeOrganization = createRevokeOrganization({ organizationRepo });
    const result = await revokeOrganization('non-existent-id');

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('ORG_NOT_FOUND');
      expect(result.error.status).toBe(404);
    }
    expect(organizationRepo.revoke).not.toHaveBeenCalled();
  });
});
