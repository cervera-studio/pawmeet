import { AppError, fail, type Organization, type Result, succeed } from '@pawmeet/types';
import type { OrganizationRepository } from '../ports/index.js';

type Deps = {
  organizationRepo: OrganizationRepository;
};

export function createRevokeOrganization({ organizationRepo }: Deps) {
  return async (organizationId: string): Promise<Result<Organization>> => {
    const org = await organizationRepo.findById(organizationId);
    if (!org) {
      return fail(new AppError('ORG_NOT_FOUND', 'Organizzazione non trovata', 404));
    }

    const revoked = await organizationRepo.revoke(organizationId);
    return succeed(revoked);
  };
}
