import type { Organization, OrganizationMember, OrganizationMemberRole } from '@pawmeet/types';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  type: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
}

export interface ListOrganizationsQuery {
  page: number;
  pageSize: number;
  search?: string;
  type?: string;
}

export interface OrganizationRepository {
  create(input: CreateOrganizationInput): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  list(query: ListOrganizationsQuery): Promise<{ data: Organization[]; total: number }>;
  update(id: string, data: Partial<CreateOrganizationInput>): Promise<Organization>;
  verify(id: string, adminUserId: string): Promise<Organization>;
  revoke(id: string): Promise<Organization>;

  addMember(organizationId: string, userId: string, role: OrganizationMemberRole): Promise<OrganizationMember>;
  removeMember(organizationId: string, userId: string): Promise<void>;
  findMember(organizationId: string, userId: string): Promise<OrganizationMember | null>;
  listMembers(organizationId: string): Promise<OrganizationMember[]>;
  isMemberOfVerifiedOrg(userId: string): Promise<{ isMember: boolean; organizationId: string | null }>;
}
