import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { OrganizationAuthorizer } from '../domain/organization-authorizer.js';
import type { OrganizationRepository } from '../ports/index.js';

type Deps = {
  organizationRepo: OrganizationRepository;
  organizationAuthorizer: OrganizationAuthorizer;
};

export function createRemoveOrganizationMember({ organizationRepo, organizationAuthorizer }: Deps) {
  return async (
    actorUserId: string,
    input: { organizationId: string; userId: string },
  ): Promise<Result<{ success: true }>> => {
    const actorMember = await organizationRepo.findMember(input.organizationId, actorUserId);
    if (!(actorMember && organizationAuthorizer.canManageMembers(actorMember.role))) {
      return fail(
        new AppError('ORG_NOT_AUTHORIZED', 'Non hai i permessi per rimuovere membri', 403),
      );
    }

    await organizationRepo.removeMember(input.organizationId, input.userId);
    return succeed({ success: true as const });
  };
}
