import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildOrganization, buildOrganizationRepo } from '../test-utils/builders.js';
import { createListOrganizations } from './list-organizations.js';

describe('listOrganizations', () => {
  it('returns paginated organizations', async () => {
    const orgs = [
      buildOrganization({ id: 'org-1', name: 'Org Alpha' }),
      buildOrganization({ id: 'org-2', name: 'Org Beta' }),
    ];
    const organizationRepo = buildOrganizationRepo({
      list: vi.fn().mockResolvedValue({ data: orgs, total: 2 }),
    });

    const listOrganizations = createListOrganizations({ organizationRepo });
    const result = await listOrganizations({ page: 1, pageSize: 10 });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data.data).toHaveLength(2);
      expect(result.data.total).toBe(2);
    }
    expect(organizationRepo.list).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
  });

  it('returns empty list when no organizations exist', async () => {
    const organizationRepo = buildOrganizationRepo({
      list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    });

    const listOrganizations = createListOrganizations({ organizationRepo });
    const result = await listOrganizations({ page: 1, pageSize: 10 });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.data.data).toHaveLength(0);
      expect(result.data.total).toBe(0);
    }
  });

  it('passes search and type filters to the repository', async () => {
    const organizationRepo = buildOrganizationRepo({
      list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    });

    const listOrganizations = createListOrganizations({ organizationRepo });
    await listOrganizations({ page: 1, pageSize: 20, search: 'dog', type: 'shelter' });

    expect(organizationRepo.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      search: 'dog',
      type: 'shelter',
    });
  });
});
