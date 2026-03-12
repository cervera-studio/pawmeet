export interface AdminOrganizationListItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  isActive: boolean;
  createdAt: string;
  memberCount: number;
}

export interface AdminOrganizationMember {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  role: string;
  createdAt: string;
}

export interface AdminOrganizationDetail {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  verifiedBy: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  members: AdminOrganizationMember[];
}

export interface ListOrganizationsParams {
  page: number;
  pageSize: number;
  search?: string;
  type?: 'pawmeet_team' | 'association' | 'educator' | 'brand';
}
