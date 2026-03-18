import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildOrganization, buildOrganizationRepo } from '../test-utils/builders.js';
import { createVerifyOrganization } from './verify-organization.js';

describe('verifyOrganization', () => {
  function setup(overrides: { org?: ReturnType<typeof buildOrganization> | null } = {}) {
    const org =
      overrides.org === undefined ? buildOrganization({ isVerified: false }) : overrides.org;
    const organizationRepo = buildOrganizationRepo({
      findById: vi.fn().mockResolvedValue(org),
    });

    const verify = createVerifyOrganization({ organizationRepo });
    return { verify, organizationRepo };
  }

  it('verifies an unverified organization', async () => {
    const { verify, organizationRepo } = setup();

    const result = await verify('admin-1', 'org-1');

    expect(isSuccess(result)).toBe(true);
    expect(organizationRepo.verify).toHaveBeenCalledWith('org-1', 'admin-1');
  });

  it('fails if organization not found', async () => {
    const { verify } = setup({ org: null });

    const result = await verify('admin-1', 'org-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORG_NOT_FOUND');
  });

  it('fails if already verified', async () => {
    const { verify } = setup({ org: buildOrganization({ isVerified: true }) });

    const result = await verify('admin-1', 'org-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORG_ALREADY_VERIFIED');
  });
});
