// Organization domain: CRUD, members, verification

import { createAddOrganizationMember } from '../use-cases/add-organization-member.js';
import { createCreateOrganization } from '../use-cases/create-organization.js';
import { createGetOrganization } from '../use-cases/get-organization.js';
import { createListOrganizationMembers } from '../use-cases/list-organization-members.js';
import { createListOrganizations } from '../use-cases/list-organizations.js';
import { createRemoveOrganizationMember } from '../use-cases/remove-organization-member.js';
import { createRevokeOrganization } from '../use-cases/revoke-organization.js';
import { createVerifyOrganization } from '../use-cases/verify-organization.js';
import { organizationAuthorizer, organizationRepo } from './services.js';

export const organizationDeps = {
  createOrganization: createCreateOrganization({ organizationRepo }),
  verifyOrganization: createVerifyOrganization({ organizationRepo }),
  revokeOrganization: createRevokeOrganization({ organizationRepo }),
  getOrganization: createGetOrganization({ organizationRepo }),
  listOrganizations: createListOrganizations({ organizationRepo }),
  addOrganizationMember: createAddOrganizationMember({ organizationRepo, organizationAuthorizer }),
  removeOrganizationMember: createRemoveOrganizationMember({
    organizationRepo,
    organizationAuthorizer,
  }),
  listOrganizationMembers: createListOrganizationMembers({ organizationRepo }),
};
