import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { OrganizationRepository } from '../ports/index.js';

type Deps = {
  organizationRepo: OrganizationRepository;
};

export function createRemoveOrganizationMember({ organizationRepo }: Deps) {
  return async (
    actorUserId: string,
    input: { organizationId: string; userId: string },
  ): Promise<Result<{ success: true }>> => {
    const actorMember = await organizationRepo.findMember(input.organizationId, actorUserId);
    if (!actorMember || (actorMember.role !== 'owner' && actorMember.role !== 'admin')) {
      return fail(
        new AppError('ORG_NOT_AUTHORIZED', 'Non hai i permessi per rimuovere membri', 403),
      );
    }

    await organizationRepo.removeMember(input.organizationId, input.userId);
    return succeed({ success: true as const });
  };
}
