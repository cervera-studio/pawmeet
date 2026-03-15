import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildOrganization, buildOrganizationRepo } from '../test-utils/builders.js';
import { createGetOrganization } from './get-organization.js';

describe('getOrganization', () => {
  it('returns the organization when found', async () => {
    const org = buildOrganization({ name: 'Dog Lovers Club' });
    const organizationRepo = buildOrganizationRepo({
      findById: vi.fn().mockResolvedValue(org),
    });

    const getOrganization = createGetOrganization({ organizationRepo });
    const result = await getOrganization(org.id);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data.id).toBe(org.id);
      expect(result.data.name).toBe('Dog Lovers Club');
    }
    expect(organizationRepo.findById).toHaveBeenCalledWith(org.id);
  });

  it('fails when organization does not exist', async () => {
    const organizationRepo = buildOrganizationRepo({
      findById: vi.fn().mockResolvedValue(null),
    });

    const getOrganization = createGetOrganization({ organizationRepo });
    const result = await getOrganization('non-existent-id');

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.code).toBe('ORG_NOT_FOUND');
      expect(result.error.status).toBe(404);
    }
  });
});
