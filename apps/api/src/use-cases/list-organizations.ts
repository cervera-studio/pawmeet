import { type Organization, type Result, succeed } from '@pawmeet/types';
import type { ListOrganizationsQuery, OrganizationRepository } from '../ports/index.js';

type Deps = {
  organizationRepo: OrganizationRepository;
};

export function createListOrganizations({ organizationRepo }: Deps) {
  return async (
    input: ListOrganizationsQuery,
  ): Promise<Result<{ data: Organization[]; total: number }>> => {
    const result = await organizationRepo.list(input);
    return succeed(result);
  };
}
