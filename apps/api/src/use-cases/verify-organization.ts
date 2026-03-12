import { AppError, fail, type Organization, type Result, succeed } from '@pawmeet/types';
import type { OrganizationRepository } from '../ports/index.js';

type Deps = {
  organizationRepo: OrganizationRepository;
};

export function createVerifyOrganization({ organizationRepo }: Deps) {
  return async (adminUserId: string, organizationId: string): Promise<Result<Organization>> => {
    const org = await organizationRepo.findById(organizationId);
    if (!org) {
      return fail(new AppError('ORG_NOT_FOUND', 'Organizzazione non trovata', 404));
    }

    if (org.isVerified) {
      return fail(new AppError('ORG_ALREADY_VERIFIED', 'Organizzazione già verificata', 409));
    }

    const verified = await organizationRepo.verify(organizationId, adminUserId);
    return succeed(verified);
  };
}
