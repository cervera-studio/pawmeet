import { type OrganizationMember, type Result, succeed } from '@pawmeet/types';
import type { OrganizationRepository } from '../ports/index.js';

type Deps = {
  organizationRepo: OrganizationRepository;
};

export function createListOrganizationMembers({ organizationRepo }: Deps) {
  return async (organizationId: string): Promise<Result<OrganizationMember[]>> => {
    const members = await organizationRepo.listMembers(organizationId);
    return succeed(members);
  };
}
