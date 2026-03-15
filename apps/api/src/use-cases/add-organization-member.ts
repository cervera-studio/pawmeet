import {
  AppError,
  fail,
  type OrganizationMember,
  type OrganizationMemberRole,
  type Result,
  succeed,
} from '@pawmeet/types';
import type { OrganizationAuthorizer } from '../domain/organization-authorizer.js';
import type { OrganizationRepository } from '../ports/index.js';

type Deps = {
  organizationRepo: OrganizationRepository;
  organizationAuthorizer: OrganizationAuthorizer;
};

type AddMemberInput = {
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
};

export function createAddOrganizationMember({ organizationRepo, organizationAuthorizer }: Deps) {
  return async (
    actorUserId: string,
    input: AddMemberInput,
  ): Promise<Result<OrganizationMember>> => {
    const org = await organizationRepo.findById(input.organizationId);
    if (!org) {
      return fail(new AppError('ORG_NOT_FOUND', 'Organizzazione non trovata', 404));
    }

    // Check that the actor is an owner or admin of the org
    const actorMember = await organizationRepo.findMember(input.organizationId, actorUserId);
    if (!actorMember || !organizationAuthorizer.canManageMembers(actorMember.role)) {
      return fail(
        new AppError('ORG_NOT_AUTHORIZED', 'Non hai i permessi per aggiungere membri', 403),
      );
    }

    // Check if user is already a member
    const existingMember = await organizationRepo.findMember(input.organizationId, input.userId);
    if (existingMember) {
      return fail(
        new AppError('ORG_MEMBER_EXISTS', 'Utente già membro di questa organizzazione', 409),
      );
    }

    const member = await organizationRepo.addMember(input.organizationId, input.userId, input.role);
    return succeed(member);
  };
}
