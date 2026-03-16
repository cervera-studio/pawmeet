import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildOrganization, buildOrganizationRepo } from '../test-utils/builders.js';
import { createGetOrganization } from './get-organization.js';

describe('getOrganization', () => {
  it('returns the organization when found', async () => {
    const org = buildOrganization({ id: 'org-1', name: 'Dog Walkers' });
    const organizationRepo = buildOrganizationRepo({
      findById: vi.fn().mockResolvedValue(org),
    });

    const getOrganization = createGetOrganization({ organizationRepo });
    const result = await getOrganization('org-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.id).toBe('org-1');
    expect(result.data.name).toBe('Dog Walkers');
    expect(organizationRepo.findById).toHaveBeenCalledWith('org-1');
  });

  it('fails when organization is not found', async () => {
    const organizationRepo = buildOrganizationRepo({
      findById: vi.fn().mockResolvedValue(null),
    });

    const getOrganization = createGetOrganization({ organizationRepo });
    const result = await getOrganization('nonexistent');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORG_NOT_FOUND');
  });
});
