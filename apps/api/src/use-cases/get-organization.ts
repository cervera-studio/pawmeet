import { AppError, fail, type Organization, type Result, succeed } from '@pawmeet/types';
import type { OrganizationRepository } from '../ports/index.js';

type Deps = {
  organizationRepo: OrganizationRepository;
};

export function createGetOrganization({ organizationRepo }: Deps) {
  return async (id: string): Promise<Result<Organization>> => {
    const org = await organizationRepo.findById(id);
    if (!org) {
      return fail(new AppError('ORG_NOT_FOUND', 'Organizzazione non trovata', 404));
    }

    return succeed(org);
  };
}
