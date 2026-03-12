export const ORGANIZATION_TYPE = {
  PAWMEET_TEAM: 'pawmeet_team',
  ASSOCIATION: 'association',
  EDUCATOR: 'educator',
  BRAND: 'brand',
} as const;

export type OrganizationType = (typeof ORGANIZATION_TYPE)[keyof typeof ORGANIZATION_TYPE];

export const ORGANIZATION_MEMBER_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type OrganizationMemberRole =
  (typeof ORGANIZATION_MEMBER_ROLE)[keyof typeof ORGANIZATION_MEMBER_ROLE];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  isVerified: boolean;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  createdAt: Date;
}
