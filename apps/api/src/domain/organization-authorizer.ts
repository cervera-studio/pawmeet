import type { OrganizationMemberRole } from '@pawmeet/types';

/**
 * Role hierarchy weight — higher means more authority.
 * Used to determine whether an actor can act on a target.
 */
const ROLE_WEIGHT: Record<OrganizationMemberRole, number> = {
  owner: 30,
  admin: 20,
  member: 10,
};

const MANAGEMENT_ROLES: ReadonlySet<OrganizationMemberRole> = new Set(['owner', 'admin']);

export interface OrganizationAuthorizer {
  /** Whether the actor can add or remove members. */
  canManageMembers(actorRole: OrganizationMemberRole): boolean;

  /** Whether the actor can update a target member's role (role hierarchy check). */
  canUpdateRole(actorRole: OrganizationMemberRole, targetRole: OrganizationMemberRole): boolean;

  /** Whether the actor can revoke (deactivate) an organization. */
  canRevokeOrg(actorRole: OrganizationMemberRole): boolean;
}

export function createOrganizationAuthorizer(): OrganizationAuthorizer {
  return {
    canManageMembers(actorRole) {
      return MANAGEMENT_ROLES.has(actorRole);
    },

    canUpdateRole(actorRole, targetRole) {
      return ROLE_WEIGHT[actorRole] > ROLE_WEIGHT[targetRole];
    },

    canRevokeOrg(actorRole) {
      return actorRole === 'owner';
    },
  };
}
