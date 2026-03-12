import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildOrganization, buildOrganizationRepo } from '../test-utils/builders.js';
import { createCreateOrganization } from './create-organization.js';

describe('createOrganization', () => {
  function setup(overrides: { slugTaken?: boolean } = {}) {
    const organizationRepo = buildOrganizationRepo({
      findBySlug: vi
        .fn()
        .mockResolvedValue(overrides.slugTaken ? buildOrganization() : null),
    });

    const createOrg = createCreateOrganization({ organizationRepo });
    return { createOrg, organizationRepo };
  }

  it('creates organization with valid input', async () => {
    const { createOrg, organizationRepo } = setup();

    const result = await createOrg('admin-1', {
      name: 'Golden Retriever Club',
      slug: 'golden-retriever-club',
      type: 'association',
    });

    expect(isSuccess(result)).toBe(true);
    expect(organizationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Golden Retriever Club',
        slug: 'golden-retriever-club',
        type: 'association',
      }),
    );
  });

  it('fails if slug is already taken', async () => {
    const { createOrg } = setup({ slugTaken: true });

    const result = await createOrg('admin-1', {
      name: 'Another Org',
      slug: 'pawmeet-team',
      type: 'association',
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORG_SLUG_TAKEN');
  });
});
