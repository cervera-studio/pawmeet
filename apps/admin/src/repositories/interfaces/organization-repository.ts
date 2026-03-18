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

export interface ListOrganizationsParams {
  page: number;
  pageSize: number;
  search?: string;
  type?: 'pawmeet_team' | 'association' | 'educator' | 'brand';
}
